
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  Truck,
  Users,
  Wallet,
  Lightbulb,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

import {
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Legend,
  Bar,
} from "recharts";

import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import "./Analytics.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const COLORS = [
  "#4f46e5",
  "#0d9488",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#0284c7",
];

const DELIVERY_COLORS = {
  Ordered: "#6366f1",
  "In Transit": "#0ea5e9",
  Delivered: "#10b981",
  Delayed: "#f97316",
  Cancelled: "#94a3b8",
};

const CONTRACT_COLORS = {
  Draft: "#94a3b8",
  Active: "#10b981",
  Expired: "#ef4444",
  Renewed: "#6366f1",
  Terminated: "#f97316",
};

const DATE_RANGE_LABELS = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "₹0";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value, decimals = 1) {
  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(decimals) : "0.0";
}

function getScoreClass(score) {
  const value = Number(score);

  if (!Number.isFinite(value)) return "analytics-score-medium";
  if (value >= 80) return "analytics-score-good";
  if (value >= 60) return "analytics-score-medium";

  return "analytics-score-low";
}

function getInsightClass(type) {
  if (type === "warning") return "warning";
  if (type === "success") return "success";
  return "info";
}

function getInsightIcon(type) {
  if (type === "warning") return AlertTriangle;
  if (type === "success") return CheckCircle2;
  return Lightbulb;
}

function getSupplierName(item) {
  return item?.supplierName || item?.name || "Unknown supplier";
}

function getCompanyName(item) {
  return item?.companyName || item?.company || "—";
}

function getStatusColor(status) {
  return (
    DELIVERY_COLORS[status] ||
    CONTRACT_COLORS[status] ||
    COLORS[0]
  );
}

function MetricCard({
  title,
  value,
  suffix = "",
  description,
  icon: Icon,
  tone = "blue",
}) {
  return (
    <article className="analytics-metric-card">
      <div className="analytics-metric-top">
        <span>{title}</span>
        <div className={`analytics-metric-icon ${tone}`}>
          <Icon size={21} />
        </div>
      </div>

      <div className="analytics-metric-value">
        {value}
        {suffix && <small>{suffix}</small>}
      </div>

      <p>{description}</p>
    </article>
  );
}

function PanelHeading({ title, subtitle, icon: Icon, tone = "" }) {
  return (
    <div className="analytics-panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {Icon && (
        <span className={`analytics-heading-icon ${tone}`}>
          <Icon size={19} />
        </span>
      )}
    </div>
  );
}

function EmptyChart({
  icon: Icon = Activity,
  title,
  message,
}) {
  return (
    <div className="analytics-empty-chart">
      <Icon size={30} />
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function Analytics() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [category, setCategory] = useState("all");
  const [supplierStatus, setSupplierStatus] = useState("all");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    const controller = new AbortController();

    try {
      const params = new URLSearchParams({
        range: dateRange,
        category,
        status: supplierStatus,
      });

      const response = await fetch(
        `${API_URL}/api/analytics/overview?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "The analytics API did not return JSON. Check your backend route and server."
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Analytics request failed with status ${response.status}.`
        );
      }

      // Support the standard { success: true, data: {...} } response.
      // Also accept a direct analytics object if the API uses that format.
      const data =
        result?.data && typeof result.data === "object"
          ? result.data
          : result;

      if (result?.success === false) {
        throw new Error(
          result.message || "The server could not load analytics."
        );
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("The analytics API returned an invalid data format.");
      }

      setReport(data);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(
          err.message ||
            "Could not connect to the analytics API. Check your backend."
        );
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [dateRange, category, supplierStatus]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function fetchReport() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          range: dateRange,
          category,
          status: supplierStatus,
        });

        const response = await fetch(
          `${API_URL}/api/analytics/overview?${params.toString()}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            "The analytics API did not return JSON. Check the backend route."
          );
        }

        const result = await response.json();

        if (!response.ok || result?.success === false) {
          throw new Error(
            result?.message ||
              `Unable to load analytics (HTTP ${response.status}).`
          );
        }

        const data =
          result?.data && typeof result.data === "object"
            ? result.data
            : result;

        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("The analytics API returned an invalid response.");
        }

        if (active) setReport(data);
      } catch (err) {
        if (active && err.name !== "AbortError") {
          setError(
            err.message ||
              "Could not connect to the analytics API. Check your backend."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchReport();

    return () => {
      active = false;
      controller.abort();
    };
  }, [dateRange, category, supplierStatus]);

  const summary = report?.summary || {};
  const rankings = Array.isArray(report?.supplierRankings)
    ? report.supplierRankings
    : [];
  const renewals = Array.isArray(report?.renewalContracts)
    ? report.renewalContracts
    : [];
  const evaluations = Array.isArray(report?.recentEvaluations)
    ? report.recentEvaluations
    : [];

  const supplierStatusData = Array.isArray(report?.supplierStatusBreakdown)
    ? report.supplierStatusBreakdown
    : [];
  const contractStatusData = Array.isArray(report?.contractStatusBreakdown)
    ? report.contractStatusBreakdown
    : [];
  const deliveryStatusData = Array.isArray(report?.deliveryStatusBreakdown)
    ? report.deliveryStatusBreakdown
    : [];
  const monthlyTrends = Array.isArray(report?.monthlyDeliveryTrends)
    ? report.monthlyDeliveryTrends
    : [];
  const businessInsights = Array.isArray(report?.businessInsights)
    ? report.businessInsights
    : [];
  const lowPerformers = Array.isArray(report?.lowPerformingSuppliers)
    ? report.lowPerformingSuppliers
    : [];

  const categories = Array.isArray(report?.filters?.categories)
    ? report.filters.categories
    : [];

  const performanceData = useMemo(
    () =>
      rankings
        .filter(
          (supplier) =>
            supplier.performanceScore !== null &&
            supplier.performanceScore !== undefined &&
            Number.isFinite(Number(supplier.performanceScore))
        )
        .slice(0, 8)
        .map((supplier) => ({
          name: getCompanyName(supplier) !== "—"
            ? getCompanyName(supplier)
            : getSupplierName(supplier),
          score: Number(supplier.performanceScore),
        })),
    [rankings]
  );

  const reliability = summary.deliveryReliability;
  const hasReliability =
    reliability !== null &&
    reliability !== undefined &&
    Number.isFinite(Number(reliability));

  const totalSuppliers = Number(summary.totalSuppliers) || 0;
  const totalDeliveries = Number(summary.totalDeliveries) || 0;

  const exportCSV = useCallback(() => {
    if (!report) return;

    const rows = [
      {
        Section: "Report Information",
        Metric: "Date Range",
        Value: DATE_RANGE_LABELS[dateRange],
      },
      {
        Section: "Report Information",
        Metric: "Supplier Category",
        Value: category === "all" ? "All Categories" : category,
      },
      {
        Section: "Report Information",
        Metric: "Supplier Status",
        Value: supplierStatus === "all" ? "All Statuses" : supplierStatus,
      },
      {
        Section: "Report Information",
        Metric: "Generated At",
        Value: new Date().toLocaleString("en-IN"),
      },
    ];

    [
      ["Total Suppliers", summary.totalSuppliers ?? 0],
      ["Active Suppliers", summary.activeSuppliers ?? 0],
      ["Inactive Suppliers", summary.inactiveSuppliers ?? 0],
      [
        "Delivery Reliability (%)",
        hasReliability ? reliability : "N/A",
      ],
      ["Average Evaluation Score", summary.averageEvaluationScore ?? 0],
      ["Total Evaluations", summary.totalEvaluations ?? 0],
      ["Total Contracts", summary.totalContracts ?? 0],
      ["Active Contracts", summary.activeContracts ?? 0],
      ["Total Contract Value (INR)", summary.totalContractValue ?? 0],
      ["Active Contract Value (INR)", summary.activeContractValue ?? 0],
      ["Total Deliveries", summary.totalDeliveries ?? 0],
      ["Delayed Deliveries", summary.delayedDeliveries ?? 0],
      ["Renewals Due Soon", summary.contractsRenewingSoon ?? 0],
    ].forEach(([metric, value]) => {
      rows.push({
        Section: "Business Summary",
        Metric: metric,
        Value: value,
      });
    });

    rankings.forEach((supplier) => {
      rows.push({
        Section: "Supplier Rankings",
        Supplier: getSupplierName(supplier),
        Company: getCompanyName(supplier),
        Status: supplier.status || "",
        Category: supplier.category || "",
        Evaluations: supplier.evaluationCount ?? 0,
        Score: supplier.performanceScore ?? "N/A",
      });
    });

    lowPerformers.forEach((supplier) => {
      rows.push({
        Section: "Suppliers Requiring Attention",
        Supplier: getSupplierName(supplier),
        Company: getCompanyName(supplier),
        Category: supplier.category || "",
        Evaluations: supplier.evaluationCount ?? 0,
        Score: supplier.performanceScore ?? "N/A",
      });
    });

    renewals.forEach((contract) => {
      rows.push({
        Section: "Contract Renewal Alerts",
        Contract:
          contract.contractName || contract.contractNumber || "Contract",
        Supplier: contract.supplierName || "—",
        EndDate: formatDate(contract.endDate),
        ContractValueINR: contract.contractValue ?? 0,
        DaysRemaining: contract.daysRemaining ?? "",
      });
    });

    evaluations.forEach((evaluation) => {
      rows.push({
        Section: "Recent Evaluations",
        Supplier: evaluation.supplierName || "—",
        Company: evaluation.companyName || "—",
        EvaluationDate: formatDate(evaluation.evaluationDate),
        Score: evaluation.overallScore ?? "N/A",
        Comments: evaluation.comments || "",
      });
    });

    deliveryStatusData.forEach((item) => {
      rows.push({
        Section: "Delivery Status",
        Status: item.name || "",
        Count: item.value ?? 0,
      });
    });

    contractStatusData.forEach((item) => {
      rows.push({
        Section: "Contract Status",
        Status: item.name || "",
        Count: item.value ?? 0,
      });
    });

    monthlyTrends.forEach((item) => {
      rows.push({
        Section: "Monthly Delivery Trends",
        Month: item.month || "",
        TotalOrders: item.total ?? 0,
        Delivered: item.delivered ?? 0,
        Delayed: item.delayed ?? 0,
      });
    });

    businessInsights.forEach((insight) => {
      rows.push({
        Section: "Business Insights",
        Type: insight.type || "info",
        Title: insight.title || "",
        Details: insight.message || "",
      });
    });

    const csv = Papa.unparse(rows);

    // Correct UTF-8 BOM so spreadsheet applications recognise the encoding.
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `PartnerPulse_Analytics_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    // Delay revocation so the browser can begin the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [
    report,
    dateRange,
    category,
    supplierStatus,
    summary,
    hasReliability,
    reliability,
    rankings,
    lowPerformers,
    renewals,
    evaluations,
    deliveryStatusData,
    contractStatusData,
    monthlyTrends,
    businessInsights,
  ]);

  const exportPDF = useCallback(() => {
    if (!report) return;

    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(20);
    doc.text("PartnerPulse Analytics Report", 14, 18);
    doc.setFontSize(9);
    doc.text(
      `Date range: ${DATE_RANGE_LABELS[dateRange]}`,
      14,
      25
    );
    doc.text(
      `Category: ${category === "all" ? "All Categories" : category}`,
      14,
      31
    );
    doc.text(
      `Status: ${supplierStatus === "all" ? "All Statuses" : supplierStatus}`,
      14,
      37
    );
    doc.text(
      `Generated: ${new Date().toLocaleString("en-IN")}`,
      14,
      43
    );
    doc.text("Supplier Relationship & Performance Analytics", 14, 49);

    const addSectionTitle = (title, y) => {
      let position = y;

      if (position > pageHeight - 35) {
        doc.addPage();
        position = 18;
      }

      doc.setFontSize(13);
      doc.text(title, 14, position);
      return position + 4;
    };

    const addTable = (title, headers, body, startY, color) => {
      const y = addSectionTitle(title, startY);

      autoTable(doc, {
        startY: y,
        head: [headers],
        body: body.length ? body : [["No records available", ...headers.slice(1).map(() => "—")]],
        theme: "striped",
        headStyles: { fillColor: color },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          overflow: "linebreak",
        },
        margin: { left: 14, right: 14 },
      });

      return (doc.lastAutoTable?.finalY || y) + 12;
    };

    let y = addTable(
      "Business Summary",
      ["Metric", "Value"],
      [
        ["Total Suppliers", summary.totalSuppliers ?? 0],
        ["Active Suppliers", summary.activeSuppliers ?? 0],
        ["Inactive Suppliers", summary.inactiveSuppliers ?? 0],
        [
          "Delivery Reliability",
          hasReliability ? `${reliability}%` : "N/A",
        ],
        [
          "Average Evaluation Score",
          `${formatNumber(summary.averageEvaluationScore)}/100`,
        ],
        ["Total Evaluations", summary.totalEvaluations ?? 0],
        ["Total Contracts", summary.totalContracts ?? 0],
        ["Active Contracts", summary.activeContracts ?? 0],
        ["Total Contract Value", formatCurrency(summary.totalContractValue)],
        ["Active Contract Value", formatCurrency(summary.activeContractValue)],
        ["Total Deliveries", summary.totalDeliveries ?? 0],
        ["Delayed Deliveries", summary.delayedDeliveries ?? 0],
        ["Renewals Due Soon", summary.contractsRenewingSoon ?? 0],
      ],
      53,
      [79, 70, 229]
    );

    y = addTable(
      "Supplier Rankings",
      ["Supplier", "Company", "Status", "Category", "Evaluations", "Score"],
      rankings.map((supplier) => [
        getSupplierName(supplier),
        getCompanyName(supplier),
        supplier.status || "—",
        supplier.category || "—",
        supplier.evaluationCount ?? 0,
        supplier.performanceScore == null
          ? "N/A"
          : `${formatNumber(supplier.performanceScore)}/100`,
      ]),
      y,
      [13, 148, 136]
    );

    y = addTable(
      "Suppliers Requiring Attention",
      ["Supplier", "Company", "Category", "Evaluations", "Score"],
      lowPerformers.map((supplier) => [
        getSupplierName(supplier),
        getCompanyName(supplier),
        supplier.category || "—",
        supplier.evaluationCount ?? 0,
        supplier.performanceScore == null
          ? "N/A"
          : `${formatNumber(supplier.performanceScore)}/100`,
      ]),
      y,
      [217, 119, 6]
    );

    y = addTable(
      "Contract Renewal Alerts",
      ["Contract", "Supplier", "End Date", "Value", "Days Remaining"],
      renewals.map((contract) => [
        contract.contractName || contract.contractNumber || "Contract",
        contract.supplierName || "—",
        formatDate(contract.endDate),
        formatCurrency(contract.contractValue),
        contract.daysRemaining ?? "—",
      ]),
      y,
      [217, 119, 6]
    );

    y = addTable(
      "Recent Evaluations",
      ["Supplier", "Company", "Date", "Score", "Comments"],
      evaluations.map((evaluation) => [
        evaluation.supplierName || "—",
        evaluation.companyName || "—",
        formatDate(evaluation.evaluationDate),
        evaluation.overallScore == null
          ? "N/A"
          : `${formatNumber(evaluation.overallScore)}/100`,
        evaluation.comments || "—",
      ]),
      y,
      [124, 58, 237]
    );

    y = addTable(
      "Delivery Status",
      ["Status", "Count"],
      deliveryStatusData.map((item) => [
        item.name || "—",
        item.value ?? 0,
      ]),
      y,
      [2, 132, 199]
    );

    y = addTable(
      "Contract Status",
      ["Status", "Count"],
      contractStatusData.map((item) => [
        item.name || "—",
        item.value ?? 0,
      ]),
      y,
      [2, 132, 199]
    );

    y = addTable(
      "Monthly Delivery Trends",
      ["Month", "Total Orders", "Delivered", "Delayed"],
      monthlyTrends.map((item) => [
        item.month || "—",
        item.total ?? 0,
        item.delivered ?? 0,
        item.delayed ?? 0,
      ]),
      y,
      [79, 70, 229]
    );

    addTable(
      "Business Insights",
      ["Type", "Title", "Details"],
      businessInsights.map((insight) => [
        insight.type || "info",
        insight.title || "Business Insight",
        insight.message || "",
      ]),
      y,
      [71, 85, 105]
    );

    const pageCount = doc.internal.getNumberOfPages();

    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.text(
        `PartnerPulse | Page ${page} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 7,
        { align: "center" }
      );
    }

    doc.save(
      `PartnerPulse_Analytics_${dateRange}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  }, [
    report,
    dateRange,
    category,
    supplierStatus,
    summary,
    hasReliability,
    reliability,
    rankings,
    lowPerformers,
    renewals,
    evaluations,
    deliveryStatusData,
    contractStatusData,
    monthlyTrends,
    businessInsights,
  ]);

  return (
    <div className="analytics-page">
      <section className="analytics-page-header">
        <div>
          <p className="analytics-eyebrow">
            PARTNERPULSE INTELLIGENCE
          </p>
          <h1>Business Analytics</h1>
          <p className="analytics-subtitle">
            Understand supplier performance, monitor delivery
            operations, and make smarter procurement decisions.
          </p>
        </div>

        <div className="analytics-header-actions">
          <label className="analytics-range-control">
            <span>Supplier category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter by supplier category"
            >
              <option value="all">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="analytics-range-control">
            <span>Supplier status</span>
            <select
              value={supplierStatus}
              onChange={(event) => setSupplierStatus(event.target.value)}
              aria-label="Filter analytics by supplier status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="under review">Under Review</option>
            </select>
          </label>

          <label className="analytics-range-control">
            <span>Date range</span>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              aria-label="Filter analytics by date range"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </label>

          <button
            type="button"
            className="analytics-export-button analytics-csv-button"
            onClick={exportCSV}
            disabled={loading || !report}
          >
            <FileSpreadsheet size={17} />
            Export CSV
          </button>

          <button
            type="button"
            className="analytics-export-button analytics-pdf-button"
            onClick={exportPDF}
            disabled={loading || !report}
          >
            <FileText size={17} />
            Export PDF
          </button>

          <button
            type="button"
            className="analytics-refresh-button"
            onClick={loadAnalytics}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "analytics-spin" : ""}
            />
            {loading ? "Loading..." : "Refresh data"}
          </button>
        </div>
      </section>

      {error && (
        <div className="analytics-error" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Analytics data could not be loaded</strong>
            <p>{error}</p>
            <button type="button" onClick={loadAnalytics}>
              Try again
            </button>
          </div>
        </div>
      )}

      {loading && !report ? (
        <div className="analytics-loading">
          <div className="analytics-loader" />
          <p>Loading your business data...</p>
        </div>
      ) : report ? (
        <>
          <section className="analytics-metrics-grid">
            <MetricCard
              title="Total Suppliers"
              value={summary.totalSuppliers ?? 0}
              description={`${summary.activeSuppliers ?? 0} active suppliers`}
              icon={Users}
              tone="blue"
            />

            <MetricCard
              title="Delivery Reliability"
              value={hasReliability ? formatNumber(reliability) : "N/A"}
              suffix={hasReliability ? "%" : ""}
              description={
                hasReliability
                  ? `${summary.onTimeDeliveries ?? 0} on-time completed deliveries`
                  : "No completed deliveries with valid dates"
              }
              icon={Truck}
              tone="green"
            />

            <MetricCard
              title="Average Evaluation"
              value={formatNumber(summary.averageEvaluationScore)}
              suffix="/100"
              description={`${summary.totalEvaluations ?? 0} evaluation records`}
              icon={ClipboardCheck}
              tone="purple"
            />

            <MetricCard
              title="Renewals Due Soon"
              value={summary.contractsRenewingSoon ?? 0}
              description="Eligible contracts expiring within 30 days"
              icon={CalendarClock}
              tone="orange"
            />
          </section>

          <section className="analytics-financial-strip">
            <div className="analytics-financial-item">
              <span className="analytics-financial-icon">
                <Wallet size={21} />
              </span>
              <div>
                <span>Total Contract Value</span>
                <strong>
                  {formatCurrency(summary.totalContractValue)}
                </strong>
                <small>All recorded contracts</small>
              </div>
            </div>

            <div className="analytics-financial-item">
              <span className="analytics-financial-icon green">
                <Building2 size={21} />
              </span>
              <div>
                <span>Active Contract Value</span>
                <strong>
                  {formatCurrency(summary.activeContractValue)}
                </strong>
                <small>
                  {summary.activeContracts ?? 0} active contracts
                </small>
              </div>
            </div>

            <div className="analytics-financial-item">
              <span className="analytics-financial-icon orange">
                <Truck size={21} />
              </span>
              <div>
                <span>Delayed Deliveries</span>
                <strong>{summary.delayedDeliveries ?? 0}</strong>
                <small>{totalDeliveries} total delivery records</small>
              </div>
            </div>
          </section>

          <section className="analytics-charts-grid">
            <article className="analytics-panel analytics-performance-panel">
              <PanelHeading
                title="Supplier Performance"
                subtitle="Ranked by recorded performance score"
                icon={Activity}
              />

              {performanceData.length > 0 ? (
                <div className="analytics-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performanceData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: -15,
                        bottom: 45,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e8edf5"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#718096" }}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "#718096" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [`${value}/100`, "Score"]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e8edf5",
                        }}
                      />
                      <Bar
                        dataKey="score"
                        name="Performance"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      >
                        {performanceData.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart
                  icon={Activity}
                  title="No supplier scores available"
                  message="Complete supplier evaluations to populate this chart."
                />
              )}
            </article>

            <article className="analytics-panel">
              <PanelHeading
                title="Supplier Status"
                subtitle="Distribution across supplier statuses"
                icon={Building2}
                tone="green"
              />

              {supplierStatusData.some((item) => Number(item.value) > 0) ? (
                <>
                  <div className="analytics-donut-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={supplierStatusData.filter(
                            (item) => Number(item.value) > 0
                          )}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={92}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {supplierStatusData
                            .filter((item) => Number(item.value) > 0)
                            .map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="analytics-donut-center">
                      <strong>{totalSuppliers}</strong>
                      <span>Suppliers</span>
                    </div>
                  </div>

                  <div className="analytics-legend">
                    {supplierStatusData
                      .filter((item) => Number(item.value) > 0)
                      .map((item) => {
                        const originalIndex = supplierStatusData.findIndex(
                          (entry) => entry.name === item.name
                        );

                        return (
                          <div key={item.name}>
                            <span
                              className="analytics-legend-dot"
                              style={{
                                backgroundColor:
                                  COLORS[originalIndex % COLORS.length],
                              }}
                            />
                            <span>{item.name}</span>
                            <strong>{item.value}</strong>
                          </div>
                        );
                      })}
                  </div>
                </>
              ) : (
                <EmptyChart
                  icon={Users}
                  title="No supplier records"
                  message="Supplier status information will appear here."
                />
              )}
            </article>
          </section>

          <section className="analytics-charts-grid">
            <article className="analytics-panel">
              <PanelHeading
                title="Contract Status"
                subtitle="Current distribution of recorded contracts"
                icon={Building2}
              />

              {contractStatusData.some((item) => Number(item.value) > 0) ? (
                <div className="analytics-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={contractStatusData.filter(
                        (item) => Number(item.value) > 0
                      )}
                      margin={{
                        top: 10,
                        right: 10,
                        left: -15,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e8edf5"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#718096" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#718096" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        name="Contracts"
                        radius={[6, 6, 0, 0]}
                      >
                        {contractStatusData
                          .filter((item) => Number(item.value) > 0)
                          .map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={CONTRACT_COLORS[entry.name] || COLORS[0]}
                            />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart
                  icon={Building2}
                  title="No contract data"
                  message="Contract status information will appear here."
                />
              )}
            </article>

            <article className="analytics-panel">
              <PanelHeading
                title="Delivery Status"
                subtitle="Orders by their current delivery status"
                icon={Truck}
                tone="green"
              />

              {deliveryStatusData.some((item) => Number(item.value) > 0) ? (
                <div className="analytics-delivery-breakdown">
                  {deliveryStatusData
                    .filter((item) => Number(item.value) > 0)
                    .map((item) => {
                      const count = Number(item.value) || 0;
                      const percentage =
                        totalDeliveries > 0
                          ? Math.min(
                              100,
                              Math.round((count / totalDeliveries) * 100)
                            )
                          : 0;
                      const color = getStatusColor(item.name);

                      return (
                        <div
                          className="analytics-delivery-row"
                          key={item.name}
                        >
                          <div className="analytics-delivery-label">
                            <span
                              className="analytics-legend-dot"
                              style={{ backgroundColor: color }}
                            />
                            <span>{item.name}</span>
                            <strong>{count}</strong>
                          </div>

                          <div className="analytics-progress-track">
                            <div
                              className="analytics-progress-fill"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <EmptyChart
                  icon={Truck}
                  title="No delivery data"
                  message="Delivery status information will appear here."
                />
              )}
            </article>
          </section>

          <section className="analytics-panel">
            <PanelHeading
              title="Monthly Delivery Trends"
              subtitle="Delivery orders over the last six calendar months"
              icon={Activity}
            />

            {monthlyTrends.length > 0 ? (
              <div className="analytics-chart analytics-trend-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyTrends}
                    margin={{
                      top: 10,
                      right: 12,
                      left: -15,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e8edf5"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#718096" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#718096" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total Orders"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="delivered"
                      name="Delivered"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="delayed"
                      name="Delayed"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart
                icon={Activity}
                title="No delivery trends available"
                message="Monthly trends will appear when delivery records are available."
              />
            )}
          </section>

          <section className="analytics-panel">
            <PanelHeading
              title="Business Insights"
              subtitle="Automatically generated observations from your current records"
              icon={Lightbulb}
              tone="orange"
            />

            {businessInsights.length > 0 ? (
              <div className="analytics-insights-grid">
                {businessInsights.map((insight, index) => {
                  const InsightIcon = getInsightIcon(insight.type);

                  return (
                    <article
                      className={`analytics-insight-card ${getInsightClass(
                        insight.type
                      )}`}
                      key={`${insight.title || "insight"}-${index}`}
                    >
                      <div className="analytics-insight-icon">
                        <InsightIcon size={20} />
                      </div>
                      <div className="analytics-insight-copy">
                        <strong>{insight.title || "Business Insight"}</strong>
                        <p>{insight.message || "No details available."}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="analytics-empty-inline">
                No business insights are available yet.
              </div>
            )}
          </section>

          <section className="analytics-panel">
            <PanelHeading
              title="Suppliers Requiring Attention"
              subtitle="Suppliers with recorded performance scores below 60/100"
              icon={AlertTriangle}
              tone="orange"
            />

            {lowPerformers.length > 0 ? (
              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Category</th>
                      <th>Evaluations</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowPerformers.map((supplier, index) => (
                      <tr key={supplier._id || `${getSupplierName(supplier)}-${index}`}>
                        <td>
                          <div className="analytics-supplier-cell">
                            <span className="analytics-rank">!</span>
                            <div>
                              <strong>{getSupplierName(supplier)}</strong>
                              <span>{getCompanyName(supplier)}</span>
                            </div>
                          </div>
                        </td>
                        <td>{supplier.category || "—"}</td>
                        <td>{supplier.evaluationCount ?? 0}</td>
                        <td>
                          {supplier.performanceScore == null ? (
                            <span className="analytics-no-score">—</span>
                          ) : (
                            <span
                              className={`analytics-score ${getScoreClass(
                                supplier.performanceScore
                              )}`}
                            >
                              {formatNumber(supplier.performanceScore)}/100
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="analytics-empty-inline">
                <CheckCircle2 size={17} />
                No low-scoring suppliers were identified from the available scores.
              </div>
            )}
          </section>

          <section className="analytics-bottom-grid">
            <article className="analytics-panel">
              <PanelHeading
                title="Supplier Rankings"
                subtitle="Compare supplier scores and evaluations"
              />

              {rankings.length > 0 ? (
                <div className="analytics-table-wrapper">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Status</th>
                        <th>Evaluations</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((supplier, index) => (
                        <tr
                          key={
                            supplier._id ||
                            `${getSupplierName(supplier)}-${index}`
                          }
                        >
                          <td>
                            <div className="analytics-supplier-cell">
                              <span className="analytics-rank">
                                {index + 1}
                              </span>
                              <div>
                                <strong>{getSupplierName(supplier)}</strong>
                                <span>{getCompanyName(supplier)}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`analytics-status ${
                                String(supplier.status).toLowerCase() === "active"
                                  ? "active"
                                  : ""
                              }`}
                            >
                              {supplier.status || "Unknown"}
                            </span>
                          </td>
                          <td>{supplier.evaluationCount ?? 0}</td>
                          <td>
                            {supplier.performanceScore == null ? (
                              <span className="analytics-no-score">—</span>
                            ) : (
                              <span
                                className={`analytics-score ${getScoreClass(
                                  supplier.performanceScore
                                )}`}
                              >
                                {formatNumber(supplier.performanceScore)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="analytics-empty-inline">
                  No supplier records found.
                </div>
              )}
            </article>

            <article className="analytics-panel">
              <PanelHeading
                title="Contract Renewal Alerts"
                subtitle="Eligible contracts ending within 30 days"
                icon={CalendarClock}
                tone="orange"
              />

              {renewals.length > 0 ? (
                <div className="analytics-renewal-list">
                  {renewals.map((contract, index) => (
                    <div
                      className="analytics-renewal-item"
                      key={contract._id || `${contract.contractNumber || "contract"}-${index}`}
                    >
                      <div className="analytics-renewal-icon">
                        <AlertTriangle size={19} />
                      </div>
                      <div className="analytics-renewal-copy">
                        <strong>
                          {contract.contractName ||
                            contract.contractNumber ||
                            "Contract"}
                        </strong>
                        <span>{contract.supplierName || "Unknown supplier"}</span>
                        <span>Ends {formatDate(contract.endDate)}</span>
                        <span>{formatCurrency(contract.contractValue)}</span>
                        <span>
                          {Number(contract.daysRemaining) === 0
                            ? "Due today"
                            : contract.daysRemaining == null
                              ? "Date unavailable"
                              : `${contract.daysRemaining} days remaining`}
                        </span>
                      </div>
                      <span className="analytics-renewal-days">
                        {contract.daysRemaining == null
                          ? "—"
                          : `${contract.daysRemaining}d`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyChart
                  icon={CheckCircle2}
                  title="No upcoming renewals"
                  message="No eligible contracts are ending within the next 30 days."
                />
              )}
            </article>
          </section>

          <section className="analytics-panel analytics-evaluations-panel">
            <PanelHeading
              title="Recent Evaluations"
              subtitle="Latest supplier performance assessments"
              icon={ClipboardCheck}
            />

            {evaluations.length > 0 ? (
              <div className="analytics-evaluation-list">
                {evaluations.map((evaluation, index) => (
                  <div
                    className="analytics-evaluation-item"
                    key={evaluation._id || `${evaluation.supplierName || "evaluation"}-${index}`}
                  >
                    <div className="analytics-evaluation-avatar">
                      {(evaluation.supplierName || "S")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="analytics-evaluation-copy">
                      <strong>{evaluation.supplierName || "Unknown supplier"}</strong>
                      <span>{evaluation.companyName || "—"}</span>
                      <small>{formatDate(evaluation.evaluationDate)}</small>
                      {evaluation.comments && <p>{evaluation.comments}</p>}
                    </div>
                    {evaluation.overallScore == null ? (
                      <span className="analytics-no-score">Not scored</span>
                    ) : (
                      <span
                        className={`analytics-score ${getScoreClass(
                          evaluation.overallScore
                        )}`}
                      >
                        {formatNumber(evaluation.overallScore)}/100
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="analytics-empty-inline">
                No completed evaluations found.
              </div>
            )}
          </section>

          <div className="analytics-report-footer">
            <span>
              <CheckCircle2 size={15} />
              Data retrieved from your PartnerPulse API
            </span>
            <span>
              Supplier Relationship &amp; Performance Analytics
            </span>
          </div>
        </>
      ) : (
        <div className="analytics-empty-chart">
          <AlertTriangle size={30} />
          <strong>No analytics data returned</strong>
          <p>Check the analytics endpoint and try again.</p>
        </div>
      )}
    </div>
  );
}

export default Analytics;
