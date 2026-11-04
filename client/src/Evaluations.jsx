
import { useCallback, useEffect, useMemo, useState } from "react";
import "./Evaluations.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const EMPTY_FORM = {
  supplier: "",
  evaluationDate: new Date().toISOString().slice(0, 10),
  qualityScore: 3,
  deliveryScore: 3,
  costScore: 3,
  communicationScore: 3,
  comments: "",
};

const RATING_FIELDS = [
  {
    name: "qualityScore",
    label: "Product / Service Quality",
    weight: "30%",
    description: "Quality, consistency, and reliability",
  },
  {
    name: "deliveryScore",
    label: "Delivery Performance",
    weight: "30%",
    description: "Timeliness and fulfillment",
  },
  {
    name: "costScore",
    label: "Cost Competitiveness",
    weight: "20%",
    description: "Pricing and value for money",
  },
  {
    name: "communicationScore",
    label: "Communication",
    weight: "20%",
    description: "Responsiveness and coordination",
  },
];

function calculateScore(form) {
  const weighted =
    Number(form.qualityScore) * 0.3 +
    Number(form.deliveryScore) * 0.3 +
    Number(form.costScore) * 0.2 +
    Number(form.communicationScore) * 0.2;

  return Math.round(weighted * 20 * 100) / 100;
}

function getSupplierName(supplier) {
  if (!supplier) return "Unknown supplier";

  if (typeof supplier === "string") {
    return supplier;
  }

  return (
    supplier.supplierName ||
    supplier.companyName ||
    "Unknown supplier"
  );
}

function getScoreClass(score) {
  if (score >= 80) return "evaluation-score-high";
  if (score >= 60) return "evaluation-score-medium";
  return "evaluation-score-low";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(response, fallback) {
  return response?.message || fallback;
}

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [evaluationResponse, supplierResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/evaluations?limit=100`),
          fetch(`${API_URL}/api/suppliers?limit=100`),
        ]);

      const evaluationJson = await evaluationResponse.json();
      const supplierJson = await supplierResponse.json();

      if (!evaluationResponse.ok || !evaluationJson.success) {
        throw new Error(
          getErrorMessage(
            evaluationJson,
            "Could not load supplier evaluations."
          )
        );
      }

      if (!supplierResponse.ok || !supplierJson.success) {
        throw new Error(
          getErrorMessage(
            supplierJson,
            "Could not load suppliers."
          )
        );
      }

      setEvaluations(
        Array.isArray(evaluationJson.data)
          ? evaluationJson.data
          : []
      );

      setSuppliers(
        Array.isArray(supplierJson.data)
          ? supplierJson.data
          : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the PartnerPulse API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEvaluations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return evaluations.filter((evaluation) => {
      const supplierName = getSupplierName(
        evaluation.supplier
      ).toLowerCase();

      const companyName =
        typeof evaluation.supplier === "object"
          ? evaluation.supplier?.companyName || ""
          : "";

      const comments = (evaluation.comments || "").toLowerCase();

      const matchesSearch =
        !query ||
        supplierName.includes(query) ||
        companyName.toLowerCase().includes(query) ||
        comments.includes(query);

      const supplierId =
        typeof evaluation.supplier === "object"
          ? evaluation.supplier?._id
          : evaluation.supplier;

      const matchesSupplier =
        !supplierFilter || supplierId === supplierFilter;

      const score = Number(evaluation.overallScore || 0);

      const matchesRating =
        ratingFilter === "all" ||
        (ratingFilter === "high" && score >= 80) ||
        (ratingFilter === "medium" && score >= 60 && score < 80) ||
        (ratingFilter === "low" && score < 60);

      return (
        matchesSearch &&
        matchesSupplier &&
        matchesRating
      );
    });
  }, [evaluations, search, supplierFilter, ratingFilter]);

  const stats = useMemo(() => {
    const total = evaluations.length;

    const average = total
      ? evaluations.reduce(
          (sum, item) => sum + Number(item.overallScore || 0),
          0
        ) / total
      : 0;

    const highest = total
      ? Math.max(
          ...evaluations.map((item) =>
            Number(item.overallScore || 0)
          )
        )
      : 0;

    const lowRated = evaluations.filter(
      (item) => Number(item.overallScore || 0) < 60
    ).length;

    return {
      total,
      average,
      highest,
      lowRated,
    };
  }, [evaluations]);

  const previewScore = calculateScore(form);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      supplier: suppliers[0]?._id || "",
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(evaluation) {
    setEditingId(evaluation._id);

    setForm({
      supplier:
        typeof evaluation.supplier === "object"
          ? evaluation.supplier?._id || ""
          : evaluation.supplier || "",
      evaluationDate: evaluation.evaluationDate
        ? new Date(evaluation.evaluationDate)
            .toISOString()
            .slice(0, 10)
        : EMPTY_FORM.evaluationDate,
      qualityScore: evaluation.qualityScore ?? 3,
      deliveryScore: evaluation.deliveryScore ?? 3,
      costScore: evaluation.costScore ?? 3,
      communicationScore:
        evaluation.communicationScore ?? 3,
      comments: evaluation.comments || "",
    });

    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        [
          "qualityScore",
          "deliveryScore",
          "costScore",
          "communicationScore",
        ].includes(name)
          ? Number(value)
          : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.supplier) {
      setError("Please select a supplier.");
      return;
    }

    if (!form.evaluationDate) {
      setError("Please select an evaluation date.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        supplier: form.supplier,
        evaluationDate: form.evaluationDate,
        qualityScore: Number(form.qualityScore),
        deliveryScore: Number(form.deliveryScore),
        costScore: Number(form.costScore),
        communicationScore: Number(
          form.communicationScore
        ),
        comments: form.comments.trim(),
      };

      const url = editingId
        ? `${API_URL}/api/evaluations/${editingId}`
        : `${API_URL}/api/evaluations`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          getErrorMessage(
            result,
            "Could not save the evaluation."
          )
        );
      }

      setModalOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });

      setNotice(
        editingId
          ? "Evaluation updated successfully."
          : "Evaluation created successfully."
      );

      await loadData();
    } catch (err) {
      setError(
        err.message || "Could not save the evaluation."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(evaluation) {
    const supplierName = getSupplierName(evaluation.supplier);

    const confirmed = window.confirm(
      `Delete the evaluation for ${supplierName}? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(evaluation._id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/api/evaluations/${evaluation._id}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          getErrorMessage(
            result,
            "Could not delete the evaluation."
          )
        );
      }

      setNotice("Evaluation deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.message || "Could not delete the evaluation."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="evaluations-page">
      <header className="evaluations-header">
        <div>
          <div className="evaluation-eyebrow">
            PARTNERPULSE / PERFORMANCE
          </div>
          <h1>Supplier Evaluations</h1>
          <p>
            Measure supplier performance and make smarter
            procurement decisions.
          </p>
        </div>

        <button
          className="evaluation-primary-button"
          onClick={openCreateModal}
          disabled={suppliers.length === 0}
        >
          <span aria-hidden="true">＋</span>
          New Evaluation
        </button>
      </header>

      {notice && (
        <div className="evaluation-alert evaluation-alert-success">
          <span>✓</span>
          {notice}
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="evaluation-alert evaluation-alert-error">
          <span>!</span>
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <section className="evaluation-stats-grid">
        <article className="evaluation-stat-card">
          <div className="evaluation-stat-top">
            <span className="evaluation-stat-label">
              Total Evaluations
            </span>
            <span className="evaluation-stat-icon icon-blue">
              ☷
            </span>
          </div>
          <div className="evaluation-stat-value">
            {stats.total}
          </div>
          <div className="evaluation-stat-foot">
            Completed evaluation records
          </div>
        </article>

        <article className="evaluation-stat-card">
          <div className="evaluation-stat-top">
            <span className="evaluation-stat-label">
              Average Score
            </span>
            <span className="evaluation-stat-icon icon-green">
              ↗
            </span>
          </div>
          <div className="evaluation-stat-value">
            {stats.total ? stats.average.toFixed(1) : "0.0"}
            <small>/100</small>
          </div>
          <div className="evaluation-stat-foot">
            Across all evaluations
          </div>
        </article>

        <article className="evaluation-stat-card">
          <div className="evaluation-stat-top">
            <span className="evaluation-stat-label">
              Highest Score
            </span>
            <span className="evaluation-stat-icon icon-purple">
              ★
            </span>
          </div>
          <div className="evaluation-stat-value">
            {stats.highest.toFixed(1)}
            <small>/100</small>
          </div>
          <div className="evaluation-stat-foot">
            Best recorded performance
          </div>
        </article>

        <article className="evaluation-stat-card">
          <div className="evaluation-stat-top">
            <span className="evaluation-stat-label">
              Needs Improvement
            </span>
            <span className="evaluation-stat-icon icon-orange">
              !
            </span>
          </div>
          <div className="evaluation-stat-value">
            {stats.lowRated}
          </div>
          <div className="evaluation-stat-foot">
            Evaluations below 60 points
          </div>
        </article>
      </section>

      <section className="evaluation-content-card">
        <div className="evaluation-section-heading">
          <div>
            <h2>Evaluation History</h2>
            <p>
              Review, compare, and manage supplier ratings.
            </p>
          </div>

          <button
            className="evaluation-refresh-button"
            onClick={loadData}
            disabled={loading}
            title="Refresh evaluations"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="evaluation-toolbar">
          <label className="evaluation-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search suppliers or comments..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <select
            className="evaluation-filter"
            value={supplierFilter}
            onChange={(event) =>
              setSupplierFilter(event.target.value)
            }
            aria-label="Filter by supplier"
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {getSupplierName(supplier)}
                {supplier.companyName
                  ? ` — ${supplier.companyName}`
                  : ""}
              </option>
            ))}
          </select>

          <select
            className="evaluation-filter"
            value={ratingFilter}
            onChange={(event) =>
              setRatingFilter(event.target.value)
            }
            aria-label="Filter by score"
          >
            <option value="all">All scores</option>
            <option value="high">High · 80–100</option>
            <option value="medium">Average · 60–79</option>
            <option value="low">Low · Below 60</option>
          </select>
        </div>

        {loading ? (
          <div className="evaluation-state">
            <div className="evaluation-spinner" />
            <p>Loading supplier evaluations...</p>
          </div>
        ) : error && evaluations.length === 0 ? (
          <div className="evaluation-state">
            <div className="evaluation-state-icon">!</div>
            <h3>Unable to load evaluations</h3>
            <p>{error}</p>
            <button
              className="evaluation-primary-button"
              onClick={loadData}
            >
              Try again
            </button>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="evaluation-state">
            <div className="evaluation-state-icon">♙</div>
            <h3>No suppliers found</h3>
            <p>
              Add a supplier in the Suppliers section before
              creating an evaluation.
            </p>
          </div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="evaluation-state">
            <div className="evaluation-state-icon">▤</div>
            <h3>No evaluations found</h3>
            <p>
              {evaluations.length === 0
                ? "Create your first supplier evaluation to start tracking performance."
                : "Try changing your search or filters."}
            </p>
            {evaluations.length === 0 && (
              <button
                className="evaluation-primary-button"
                onClick={openCreateModal}
              >
                Create First Evaluation
              </button>
            )}
          </div>
        ) : (
          <div className="evaluation-table-wrapper">
            <table className="evaluation-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Quality</th>
                  <th>Delivery</th>
                  <th>Cost</th>
                  <th>Communication</th>
                  <th>Overall Score</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredEvaluations.map((evaluation) => (
                  <tr key={evaluation._id}>
                    <td>
                      <div className="evaluation-supplier-cell">
                        <div className="evaluation-avatar">
                          {getSupplierName(
                            evaluation.supplier
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <strong>
                            {getSupplierName(
                              evaluation.supplier
                            )}
                          </strong>
                          <span>
                            {typeof evaluation.supplier === "object"
                              ? evaluation.supplier?.companyName ||
                                evaluation.supplier?.email ||
                                "Supplier"
                              : "Supplier"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>{formatDate(evaluation.evaluationDate)}</td>
                    <td>
                      <span className="evaluation-rating-pill">
                        {evaluation.qualityScore}/5
                      </span>
                    </td>
                    <td>
                      <span className="evaluation-rating-pill">
                        {evaluation.deliveryScore}/5
                      </span>
                    </td>
                    <td>
                      <span className="evaluation-rating-pill">
                        {evaluation.costScore}/5
                      </span>
                    </td>
                    <td>
                      <span className="evaluation-rating-pill">
                        {evaluation.communicationScore}/5
                      </span>
                    </td>

                    <td>
                      <span
                        className={`evaluation-score-badge ${getScoreClass(
                          Number(evaluation.overallScore || 0)
                        )}`}
                      >
                        {Number(
                          evaluation.overallScore || 0
                        ).toFixed(1)}
                        /100
                      </span>
                    </td>

                    <td>
                      <div className="evaluation-row-actions">
                        <button
                          className="evaluation-icon-button"
                          title="Edit evaluation"
                          aria-label="Edit evaluation"
                          onClick={() =>
                            openEditModal(evaluation)
                          }
                        >
                          ✎
                        </button>

                        <button
                          className="evaluation-icon-button evaluation-delete-button"
                          title="Delete evaluation"
                          aria-label="Delete evaluation"
                          disabled={deletingId === evaluation._id}
                          onClick={() =>
                            handleDelete(evaluation)
                          }
                        >
                          {deletingId === evaluation._id
                            ? "…"
                            : "⌫"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="evaluation-table-footer">
          Showing {filteredEvaluations.length} of{" "}
          {evaluations.length} evaluations
        </div>
      </section>

      {modalOpen && (
        <div
          className="evaluation-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="evaluation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evaluation-modal-title"
          >
            <div className="evaluation-modal-header">
              <div>
                <span className="evaluation-eyebrow">
                  PERFORMANCE ASSESSMENT
                </span>
                <h2 id="evaluation-modal-title">
                  {editingId
                    ? "Edit Evaluation"
                    : "New Supplier Evaluation"}
                </h2>
                <p>
                  Rate each area from 1 (poor) to 5 (excellent).
                </p>
              </div>

              <button
                className="evaluation-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="evaluation-alert evaluation-alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="evaluation-form-grid">
                <label className="evaluation-form-field">
                  <span>Supplier *</span>
                  <select
                    name="supplier"
                    value={form.supplier}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option
                        key={supplier._id}
                        value={supplier._id}
                      >
                        {getSupplierName(supplier)}
                        {supplier.companyName
                          ? ` — ${supplier.companyName}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="evaluation-form-field">
                  <span>Evaluation Date *</span>
                  <input
                    type="date"
                    name="evaluationDate"
                    value={form.evaluationDate}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>

              <div className="evaluation-rating-heading">
                <div>
                  <h3>Performance Criteria</h3>
                  <p>
                    Each criterion contributes to the final score.
                  </p>
                </div>
                <span>Rating / 5</span>
              </div>

              <div className="evaluation-rating-list">
                {RATING_FIELDS.map((field) => (
                  <div
                    className="evaluation-rating-row"
                    key={field.name}
                  >
                    <div className="evaluation-rating-copy">
                      <strong>{field.label}</strong>
                      <span>{field.description}</span>
                    </div>

                    <div className="evaluation-rating-controls">
                      <div
                        className="evaluation-star-picker"
                        role="group"
                        aria-label={field.label}
                      >
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            type="button"
                            key={rating}
                            className={
                              rating <= form[field.name]
                                ? "evaluation-star active"
                                : "evaluation-star"
                            }
                            aria-label={`${rating} out of 5`}
                            aria-pressed={
                              form[field.name] === rating
                            }
                            onClick={() =>
                              setForm((previous) => ({
                                ...previous,
                                [field.name]: rating,
                              }))
                            }
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      <span className="evaluation-weight">
                        {field.weight}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="evaluation-score-preview">
                <div>
                  <span>Calculated Overall Score</span>
                  <small>
                    Weighted performance rating out of 100
                  </small>
                </div>
                <strong>{previewScore.toFixed(1)}<small>/100</small></strong>
              </div>

              <label className="evaluation-form-field evaluation-comments-field">
                <span>Comments / Feedback</span>
                <textarea
                  name="comments"
                  value={form.comments}
                  onChange={handleFormChange}
                  placeholder="Describe supplier strengths, issues, or improvement areas..."
                  rows={4}
                  maxLength={1000}
                />
                <small>{form.comments.length}/1000 characters</small>
              </label>

              <div className="evaluation-modal-actions">
                <button
                  type="button"
                  className="evaluation-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="evaluation-primary-button"
                  disabled={saving || !suppliers.length}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Save Evaluation"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
