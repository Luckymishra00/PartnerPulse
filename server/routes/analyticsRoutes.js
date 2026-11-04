
const express = require("express");

const Supplier = require("../models/Supplier");
const Contract = require("../models/Contract");
const Delivery = require("../models/Delivery");
const Evaluation = require("../models/Evaluation");

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

function getSupplierId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
}

function getContractEndDate(contract) {
  const value = contract.expiryDate;
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getOverallScore(evaluation) {
  const value = evaluation.overallScore;

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;

  return (
    Math.round((value + Number.EPSILON) * factor) / factor
  );
}

function normalizeStatus(value) {
  return String(value || "Unknown").trim().toLowerCase();
}

function startOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function getRecordDate(record, fields) {
  for (const field of fields) {
    if (record && record[field]) {
      const date = new Date(record[field]);

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

function filterByRange(records, range, fields, fromDate) {
  return records.filter((record) => {
    const date = getRecordDate(record, fields);

    return !date || date >= fromDate;
  });
}

function getRangeDays(range) {
  const ranges = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  return ranges[range] || 30;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthLabel(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function buildStatusBreakdown(items, statuses) {
  return statuses.map((status) => ({
    name: status,
    value: items.filter(
      (item) =>
        normalizeStatus(item.status) === normalizeStatus(status)
    ).length,
  }));
}

/*
 * Contract renewal alert calculation.
 *
 * expired: contract end date has passed, up to 30 days ago
 * urgent:  expires today or within 7 days
 * upcoming: expires in 8–30 days
 *
 * Cancelled, terminated, and renewed contracts are excluded.
 */
function buildRenewalContracts(allContracts, suppliers, today) {
  const todayStart = startOfDay(today);

  const next30Days = new Date(todayStart);
  next30Days.setDate(next30Days.getDate() + 30);

  const past30Days = new Date(todayStart);
  past30Days.setDate(past30Days.getDate() - 30);

  return allContracts
    .map((contract) => ({
      contract,
      endDate: getContractEndDate(contract),
    }))
    .filter(({ contract, endDate }) => {
      if (!endDate) return false;

      const status = normalizeStatus(contract.status);

      if (
        [
          "terminated",
          "cancelled",
          "canceled",
          "renewed",
        ].includes(status)
      ) {
        return false;
      }

      const expiryDay = startOfDay(endDate);

      // Keep recently expired contracts and contracts expiring
      // within the coming 30 days.
      return expiryDay >= past30Days && expiryDay <= next30Days;
    })
    .map(({ contract, endDate }) => {
      const supplierId = getSupplierId(contract.supplier);

      const supplier = suppliers.find(
        (item) => String(item._id) === supplierId
      );

      const expiryDay = startOfDay(endDate);

      const daysRemaining = Math.round(
        (expiryDay.getTime() - todayStart.getTime()) / DAY_MS
      );

      let alertType;
      let alertMessage;

      if (
        daysRemaining < 0 ||
        normalizeStatus(contract.status) === "expired"
      ) {
        alertType = "expired";

        alertMessage =
          daysRemaining < 0
            ? `Expired ${Math.abs(daysRemaining)} day(s) ago`
            : "Marked as expired";
      } else if (daysRemaining <= 7) {
        alertType = "urgent";

        alertMessage =
          daysRemaining === 0
            ? "Expires today"
            : `Expires in ${daysRemaining} day(s)`;
      } else {
        alertType = "upcoming";
        alertMessage = `Expires in ${daysRemaining} days`;
      }

      return {
        _id: contract._id,
        contractNumber: contract.contractNumber || "—",
        contractName:
          contract.contractName || "Untitled contract",
        supplier: contract.supplier || null,
        supplierName:
          supplier?.supplierName || "Unknown supplier",
        companyName: supplier?.companyName || "—",
        contractValue: Number(contract.contractValue) || 0,
        endDate,
        daysRemaining,
        alertType,
        alertMessage,
        status: contract.status || "Unknown",
      };
    })
    .sort((a, b) => {
      const priority = {
        expired: 0,
        urgent: 1,
        upcoming: 2,
      };

      return (
        priority[a.alertType] - priority[b.alertType] ||
        a.daysRemaining - b.daysRemaining
      );
    });
}

function buildInsights({
  suppliers,
  contracts,
  deliveries,
  supplierRankings,
  renewalContracts,
  summary,
}) {
  const insights = [];

  const expiredCount = renewalContracts.filter(
    (contract) => contract.alertType === "expired"
  ).length;

  const urgentCount = renewalContracts.filter(
    (contract) => contract.alertType === "urgent"
  ).length;

  const lowPerformers = supplierRankings.filter(
    (supplier) =>
      supplier.performanceScore !== null &&
      supplier.performanceScore < 60
  );

  if (lowPerformers.length > 0) {
    insights.push({
      type: "warning",
      title: "Supplier performance needs attention",
      message: `${lowPerformers.length} supplier(s) have performance scores below 60/100. Review their latest evaluations.`,
      metric: lowPerformers.length,
    });
  } else if (summary.totalEvaluations > 0) {
    insights.push({
      type: "success",
      title: "No low-scoring evaluated suppliers",
      message:
        "All suppliers with available performance scores are at or above 60/100.",
      metric: null,
    });
  } else {
    insights.push({
      type: "info",
      title: "Supplier evaluations are needed",
      message:
        "Add supplier evaluations to identify strong performers and suppliers that need improvement.",
      metric: null,
    });
  }

  if (expiredCount > 0) {
    insights.push({
      type: "warning",
      title: "Expired contracts need attention",
      message: `${expiredCount} contract(s) have expired within the last 30 days. Review renewal status or close out the agreement.`,
      metric: expiredCount,
    });
  }

  if (urgentCount > 0) {
    insights.push({
      type: "warning",
      title: "Urgent contract renewals",
      message: `${urgentCount} contract(s) expire within 7 days. Contact the relevant suppliers and review renewal terms.`,
      metric: urgentCount,
    });
  }

  const upcomingCount = renewalContracts.filter(
    (contract) => contract.alertType === "upcoming"
  ).length;

  if (upcomingCount > 0) {
    insights.push({
      type: "info",
      title: "Upcoming contract renewals",
      message: `${upcomingCount} contract(s) expire in 8–30 days. Start reviewing renewal requirements.`,
      metric: upcomingCount,
    });
  }

  if (renewalContracts.length === 0) {
    insights.push({
      type: "success",
      title: "No contracts need renewal attention",
      message:
        "No eligible contracts were found that expired within the last 30 days or expire within the next 30 days.",
      metric: 0,
    });
  }

  if (summary.delayedDeliveries > 0) {
    insights.push({
      type: "warning",
      title: "Delivery delays detected",
      message: `${summary.delayedDeliveries} delivery record(s) are marked delayed, delivered late, or overdue.`,
      metric: summary.delayedDeliveries,
    });
  } else if (deliveries.length > 0) {
    insights.push({
      type: "success",
      title: "No delivery delays detected",
      message:
        "No deliveries currently meet the dashboard's delay criteria.",
      metric: 0,
    });
  }

  const inactiveSuppliers = suppliers.filter(
    (supplier) => normalizeStatus(supplier.status) !== "active"
  ).length;

  if (inactiveSuppliers > 0) {
    insights.push({
      type: "info",
      title: "Review inactive or under-review suppliers",
      message: `${inactiveSuppliers} supplier(s) are not currently marked Active.`,
      metric: inactiveSuppliers,
    });
  }

  if (summary.deliveryReliability !== null) {
    if (summary.deliveryReliability < 80) {
      insights.push({
        type: "warning",
        title: "On-time delivery performance is low",
        message: `On-time delivery reliability is ${summary.deliveryReliability}%. Review supplier schedules and delivery commitments.`,
        metric: summary.deliveryReliability,
      });
    } else {
      insights.push({
        type: "success",
        title: "On-time delivery performance",
        message: `On-time delivery reliability is ${summary.deliveryReliability}%.`,
        metric: summary.deliveryReliability,
      });
    }
  }

  const activeContractValue = contracts
    .filter(
      (contract) => normalizeStatus(contract.status) === "active"
    )
    .reduce((total, contract) => {
      const value = Number(contract.contractValue);

      return total + (Number.isFinite(value) ? value : 0);
    }, 0);

  insights.push({
    type: "info",
    title: "Active contract value",
    message: `The combined value of active contracts is ${round(
      activeContractValue,
      2
    )}.`,
    metric: round(activeContractValue, 2),
  });

  return insights.slice(0, 6);
}

router.get("/overview", async (req, res) => {
  try {
    const [suppliers, allContracts, allDeliveries, allEvaluations] =
      await Promise.all([
        Supplier.find().lean(),
        Contract.find().lean(),
        Delivery.find().lean(),
        Evaluation.find().lean(),
      ]);

    const allowedRanges = ["7d", "30d", "90d"];

    const range = allowedRanges.includes(String(req.query.range))
      ? String(req.query.range)
      : "30d";

    const rangeDays = getRangeDays(range);
    const today = startOfDay(new Date());

    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - (rangeDays - 1));

    const contracts = filterByRange(
      allContracts,
      range,
      ["startDate", "effectiveDate", "createdAt", "createdOn"],
      fromDate
    );

    const deliveries = filterByRange(
      allDeliveries,
      range,
      ["orderDate", "createdAt", "createdOn"],
      fromDate
    );

    const evaluations = filterByRange(
      allEvaluations,
      range,
      ["evaluationDate", "createdAt", "createdOn"],
      fromDate
    );

    // Supplier metrics
    const activeSuppliers = suppliers.filter(
      (supplier) => normalizeStatus(supplier.status) === "active"
    ).length;

    const supplierStatusBreakdown = buildStatusBreakdown(suppliers, [
      "Active",
      "Inactive",
      "Under Review",
    ]);

    // Evaluation metrics
    const scores = evaluations
      .map((evaluation) => ({
        evaluation,
        score: getOverallScore(evaluation),
      }))
      .filter((item) => item.score !== null);

    const averageScore =
      scores.length > 0
        ? round(
            scores.reduce((sum, item) => sum + item.score, 0) /
              scores.length
          )
        : 0;

    const highestScore =
      scores.length > 0
        ? Math.max(...scores.map((item) => item.score))
        : 0;

    const needsImprovement = scores.filter(
      (item) => item.score < 60
    ).length;

    // Delivery metrics
    const delivered = deliveries.filter(
      (delivery) => normalizeStatus(delivery.status) === "delivered"
    );

    const cancelled = deliveries.filter(
      (delivery) => normalizeStatus(delivery.status) === "cancelled"
    );

    const completedDeliveries = delivered.filter(
      (delivery) =>
        delivery.actualDeliveryDate &&
        delivery.expectedDeliveryDate &&
        !Number.isNaN(
          new Date(delivery.actualDeliveryDate).getTime()
        ) &&
        !Number.isNaN(
          new Date(delivery.expectedDeliveryDate).getTime()
        )
    );

    const onTimeDeliveries = completedDeliveries.filter(
      (delivery) =>
        new Date(delivery.actualDeliveryDate).getTime() <=
        new Date(delivery.expectedDeliveryDate).getTime()
    );

    const lateDelivered = completedDeliveries.filter(
      (delivery) =>
        new Date(delivery.actualDeliveryDate).getTime() >
        new Date(delivery.expectedDeliveryDate).getTime()
    );

    const delayedDeliveries = deliveries.filter((delivery) => {
      const status = normalizeStatus(delivery.status);

      if (status === "cancelled") return false;
      if (status === "delayed") return true;

      if (status === "delivered") {
        return lateDelivered.some(
          (item) => String(item._id) === String(delivery._id)
        );
      }

      if (
        delivery.expectedDeliveryDate &&
        !["cancelled", "delivered"].includes(status)
      ) {
        const expectedDate = new Date(delivery.expectedDeliveryDate);

        return (
          !Number.isNaN(expectedDate.getTime()) &&
          expectedDate < today
        );
      }

      return false;
    });

    const deliveryReliability =
      completedDeliveries.length > 0
        ? Math.round(
            (onTimeDeliveries.length / completedDeliveries.length) *
              100
          )
        : null;

    const deliveryStatusBreakdown = buildStatusBreakdown(deliveries, [
      "Ordered",
      "In Transit",
      "Delivered",
      "Delayed",
      "Cancelled",
    ]);

    // Contract metrics
    const contractStatusBreakdown = buildStatusBreakdown(contracts, [
      "Draft",
      "Active",
      "Expired",
      "Renewed",
      "Terminated",
    ]);

    const activeContracts = contracts.filter(
      (contract) => normalizeStatus(contract.status) === "active"
    );

    const totalContractValue = contracts.reduce((total, contract) => {
      const value = Number(contract.contractValue);

      return total + (Number.isFinite(value) ? value : 0);
    }, 0);

    const activeContractValue = activeContracts.reduce(
      (total, contract) => {
        const value = Number(contract.contractValue);

        return total + (Number.isFinite(value) ? value : 0);
      },
      0
    );

    // Improved contract renewal tracking from MongoDB records
    const renewalContracts = buildRenewalContracts(
      allContracts,
      suppliers,
      today
    );

    // Supplier performance rankings
    const supplierScores = new Map();

    for (const item of scores) {
      const supplierId = getSupplierId(item.evaluation.supplier);

      if (!supplierId) continue;

      if (!supplierScores.has(supplierId)) {
        supplierScores.set(supplierId, {
          total: 0,
          count: 0,
        });
      }

      const current = supplierScores.get(supplierId);

      current.total += item.score;
      current.count += 1;
    }

    const supplierRankings = suppliers
      .map((supplier) => {
        const result = supplierScores.get(String(supplier._id));

        const evaluationAverage =
          result && result.count > 0
            ? result.total / result.count
            : null;

        const storedScore =
          supplier.performanceScore === null ||
          supplier.performanceScore === undefined
            ? null
            : Number(supplier.performanceScore);

        const score =
          evaluationAverage !== null
            ? round(evaluationAverage)
            : storedScore !== null && Number.isFinite(storedScore)
              ? storedScore
              : null;

        return {
          _id: supplier._id,
          supplierName: supplier.supplierName || "Unnamed supplier",
          companyName: supplier.companyName || "—",
          category: supplier.category || "Other",
          status: supplier.status || "Unknown",
          evaluationCount: result?.count || 0,
          performanceScore: score,
        };
      })
      .sort((a, b) => {
        if (a.performanceScore === null) return 1;
        if (b.performanceScore === null) return -1;

        return b.performanceScore - a.performanceScore;
      });

    const lowPerformingSuppliers = supplierRankings
      .filter(
        (supplier) =>
          supplier.performanceScore !== null &&
          supplier.performanceScore < 60
      )
      .slice(0, 5);

    // Recent evaluations
    const recentEvaluations = scores
      .slice()
      .sort(
        (a, b) =>
          new Date(
            b.evaluation.evaluationDate ||
              b.evaluation.createdAt ||
              0
          ) -
          new Date(
            a.evaluation.evaluationDate ||
              a.evaluation.createdAt ||
              0
          )
      )
      .slice(0, 6)
      .map(({ evaluation, score }) => {
        const supplierId = getSupplierId(evaluation.supplier);

        const supplier = suppliers.find(
          (item) => String(item._id) === supplierId
        );

        return {
          _id: evaluation._id,
          supplierName: supplier?.supplierName || "Unknown supplier",
          companyName: supplier?.companyName || "—",
          evaluationDate:
            evaluation.evaluationDate ||
            evaluation.createdAt ||
            null,
          overallScore: score,
          comments: evaluation.comments || "",
        };
      });

    // Monthly delivery trend
    const monthlyDeliveryTrends = [];

    for (let offset = 5; offset >= 0; offset--) {
      const monthDate = new Date(
        today.getFullYear(),
        today.getMonth() - offset,
        1
      );

      const key = getMonthKey(monthDate);

      const monthDeliveries = deliveries.filter((delivery) => {
        if (!delivery.orderDate) return false;

        const orderDate = new Date(delivery.orderDate);

        return (
          !Number.isNaN(orderDate.getTime()) &&
          getMonthKey(orderDate) === key
        );
      });

      monthlyDeliveryTrends.push({
        month: getMonthLabel(monthDate),
        total: monthDeliveries.length,
        delivered: monthDeliveries.filter(
          (delivery) =>
            normalizeStatus(delivery.status) === "delivered"
        ).length,
        delayed: monthDeliveries.filter(
          (delivery) => normalizeStatus(delivery.status) === "delayed"
        ).length,
        cancelled: monthDeliveries.filter(
          (delivery) =>
            normalizeStatus(delivery.status) === "cancelled"
        ).length,
      });
    }

    // Summary
    const summary = {
      totalSuppliers: suppliers.length,
      activeSuppliers,
      inactiveSuppliers: suppliers.length - activeSuppliers,
      totalContracts: contracts.length,
      activeContracts: activeContracts.length,
      totalContractValue: round(totalContractValue, 2),
      activeContractValue: round(activeContractValue, 2),
      deliveredCount: delivered.length,
      cancelledDeliveries: cancelled.length,
      delayedDeliveries: delayedDeliveries.length,
      totalDeliveries: deliveries.length,
      completedDeliveries: completedDeliveries.length,
      onTimeDeliveries: onTimeDeliveries.length,
      lateDeliveredCount: lateDelivered.length,
      deliveryReliability,
      totalEvaluations: evaluations.length,
      averageEvaluationScore: averageScore,
      highestEvaluationScore: highestScore,
      needsImprovement,
      contractsRenewingSoon: renewalContracts.length,
      expiredContracts: renewalContracts.filter(
        (contract) => contract.alertType === "expired"
      ).length,
      urgentRenewals: renewalContracts.filter(
        (contract) => contract.alertType === "urgent"
      ).length,
      upcomingRenewals: renewalContracts.filter(
        (contract) => contract.alertType === "upcoming"
      ).length,
    };

    const businessInsights = buildInsights({
      suppliers,
      contracts,
      deliveries,
      supplierRankings,
      renewalContracts,
      summary,
    });

    // API response
    return res.json({
      success: true,
      data: {
        filters: {
          range,
          rangeDays,
          fromDate: fromDate.toISOString(),
          toDate: today.toISOString(),
        },
        summary,
        supplierRankings: supplierRankings.slice(0, 10),
        lowPerformingSuppliers,
        renewalContracts,
        recentEvaluations,
        supplierStatusBreakdown,
        contractStatusBreakdown,
        deliveryStatusBreakdown,
        monthlyDeliveryTrends,
        businessInsights,
      },
    });
  } catch (error) {
    console.error("Analytics overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate analytics overview.",
    });
  }
});

module.exports = router;
