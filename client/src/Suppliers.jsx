
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Building2,
  Users,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Mail,
  Phone,
  MapPin,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import "./Suppliers.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const CATEGORIES = [
  "Raw Materials",
  "Technology",
  "Logistics",
  "Packaging",
  "Maintenance",
  "Other",
];

const STATUSES = ["Active", "Inactive", "Under Review"];

const EMPTY_FORM = {
  supplierName: "",
  companyName: "",
  email: "",
  phone: "",
  category: "Raw Materials",
  address: "",
  status: "Active",
  performanceScore: "",
  notes: "",
};

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed with status ${response.status}.`
    );
  }

  return result;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });

      if (search.trim()) params.set("search", search.trim());
      if (category !== "All") params.set("category", category);
      if (status !== "All") params.set("status", status);

      const result = await apiRequest(
        `/api/suppliers?${params.toString()}`
      );

      setSuppliers(Array.isArray(result.data) ? result.data : []);
      setTotal(
        typeof result.total === "number"
          ? result.total
          : result.count || 0
      );
      setTotalPages(
        Math.max(1, result.totalPages || 1)
      );
    } catch (err) {
      setSuppliers([]);
      setTotal(0);
      setTotalPages(1);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    setPage(1);
  }, [search, category, status]);

  function openAddForm() {
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
    setNotice("");
  }

  function openEditForm(supplier) {
    setEditingSupplier(supplier);
    setForm({
      supplierName: supplier.supplierName || "",
      companyName: supplier.companyName || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      category: supplier.category || "Other",
      address: supplier.address || "",
      status: supplier.status || "Active",
      performanceScore:
        supplier.performanceScore ?? "",
      notes: supplier.notes || "",
    });
    setFormError("");
    setShowForm(true);
    setNotice("");
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    if (
      !form.supplierName.trim() ||
      !form.companyName.trim() ||
      !form.email.trim() ||
      !form.category
    ) {
      setFormError(
        "Supplier name, company name, email, and category are required."
      );
      return;
    }

    const emailPattern = /^\S+@\S+\.\S+$/;

    if (!emailPattern.test(form.email.trim())) {
      setFormError("Please enter a valid email address.");
      return;
    }

    const score =
      form.performanceScore === ""
        ? null
        : Number(form.performanceScore);

    if (
      score !== null &&
      (!Number.isFinite(score) || score < 0 || score > 100)
    ) {
      setFormError("Performance score must be between 0 and 100.");
      return;
    }

    const payload = {
      supplierName: form.supplierName.trim(),
      companyName: form.companyName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      category: form.category,
      address: form.address.trim(),
      status: form.status,
      performanceScore: score,
      notes: form.notes.trim(),
    };

    setSaving(true);

    try {
      if (editingSupplier) {
        await apiRequest(
          `/api/suppliers/${editingSupplier._id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setNotice("Supplier updated successfully.");
      } else {
        await apiRequest("/api/suppliers", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setNotice("Supplier added successfully.");
        setPage(1);
      }

      setShowForm(false);
      setEditingSupplier(null);
      setForm(EMPTY_FORM);

      await loadSuppliers();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${supplier.supplierName}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`/api/suppliers/${supplier._id}`, {
        method: "DELETE",
      });

      setNotice("Supplier deleted successfully.");

      if (suppliers.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadSuppliers();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const activeCount = suppliers.filter(
    (supplier) => supplier.status === "Active"
  ).length;

  const reviewedCount = suppliers.filter(
    (supplier) => supplier.status === "Under Review"
  ).length;

  const hasFilters =
    search.trim() !== "" ||
    category !== "All" ||
    status !== "All";

  function clearFilters() {
    setSearch("");
    setCategory("All");
    setStatus("All");
    setPage(1);
  }

  return (
    <div className="suppliers-page">
      <div className="suppliers-heading">
        <div>
          <div className="suppliers-eyebrow">
            PARTNER MANAGEMENT
          </div>
          <h1>Suppliers</h1>
          <p>
            Manage supplier information, relationships, and
            business contacts in one place.
          </p>
        </div>

        <button
          type="button"
          className="supplier-primary-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Supplier
        </button>
      </div>

      {notice && (
        <div className="supplier-alert supplier-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="supplier-alert supplier-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="supplier-summary-grid">
        <div className="supplier-summary-card">
          <div className="supplier-summary-icon blue">
            <Building2 size={21} />
          </div>
          <div>
            <span>Total suppliers</span>
            <strong>{loading ? "…" : total}</strong>
            <small>Matching current filters</small>
          </div>
        </div>

        <div className="supplier-summary-card">
          <div className="supplier-summary-icon green">
            <CheckCircle2 size={21} />
          </div>
          <div>
            <span>Active on this page</span>
            <strong>{loading ? "…" : activeCount}</strong>
            <small>Currently active suppliers</small>
          </div>
        </div>

        <div className="supplier-summary-card">
          <div className="supplier-summary-icon amber">
            <Users size={21} />
          </div>
          <div>
            <span>Under review</span>
            <strong>{loading ? "…" : reviewedCount}</strong>
            <small>On the current page</small>
          </div>
        </div>
      </div>

      <section className="supplier-directory">
        <div className="supplier-directory-heading">
          <div>
            <h2>Supplier directory</h2>
            <p>Search and manage your registered suppliers.</p>
          </div>

          <button
            type="button"
            className="supplier-icon-button"
            onClick={loadSuppliers}
            disabled={loading}
            title="Refresh suppliers"
            aria-label="Refresh suppliers"
          >
            <RefreshCw
              size={17}
              className={loading ? "supplier-spinning" : ""}
            />
          </button>
        </div>

        <div className="supplier-filters">
          <label className="supplier-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search name, company, or email..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>

          <label className="supplier-filter-select">
            <SlidersHorizontal size={16} />
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
            >
              <option value="All">All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="supplier-filter-select">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="All">All statuses</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              className="supplier-clear-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>SUPPLIER</th>
                <th>CATEGORY</th>
                <th>CONTACT</th>
                <th>PERFORMANCE</th>
                <th>STATUS</th>
                <th>ADDED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="supplier-table-message">
                    <RefreshCw
                      size={22}
                      className="supplier-spinning"
                    />
                    <span>Loading suppliers…</span>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="supplier-table-message">
                    <Building2 size={28} />
                    <strong>
                      {hasFilters
                        ? "No matching suppliers"
                        : "No suppliers yet"}
                    </strong>
                    <span>
                      {hasFilters
                        ? "Try changing your search or filters."
                        : "Add your first supplier to get started."}
                    </span>

                    {hasFilters ? (
                      <button
                        type="button"
                        className="supplier-secondary-button"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="supplier-primary-button"
                        onClick={openAddForm}
                      >
                        <Plus size={16} />
                        Add Supplier
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier._id}>
                    <td>
                      <div className="supplier-identity">
                        <div className="supplier-avatar">
                          {getInitials(supplier.companyName)}
                        </div>
                        <div className="supplier-identity-text">
                          <strong>{supplier.companyName}</strong>
                          <span>{supplier.supplierName}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="supplier-category-pill">
                        {supplier.category}
                      </span>
                    </td>

                    <td>
                      <div className="supplier-contact">
                        <span>
                          <Mail size={13} />
                          {supplier.email}
                        </span>
                        {supplier.phone && (
                          <span>
                            <Phone size={13} />
                            {supplier.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      {supplier.performanceScore == null ? (
                        <span className="supplier-muted">Not rated</span>
                      ) : (
                        <div className="supplier-score">
                          <div className="supplier-score-track">
                            <div
                              className="supplier-score-fill"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    supplier.performanceScore
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                          <strong>
                            {supplier.performanceScore}/100
                          </strong>
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        className={`supplier-status status-${(
                          supplier.status || "Active"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        <span className="supplier-status-dot" />
                        {supplier.status || "Active"}
                      </span>
                    </td>

                    <td>
                      <span className="supplier-date">
                        {formatDate(supplier.createdAt)}
                      </span>
                    </td>

                    <td>
                      <div className="supplier-row-actions">
                        <button
                          type="button"
                          className="supplier-action-button"
                          onClick={() => openEditForm(supplier)}
                          title="Edit supplier"
                          aria-label={`Edit ${supplier.companyName}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="supplier-action-button delete"
                          onClick={() => handleDelete(supplier)}
                          title="Delete supplier"
                          aria-label={`Delete ${supplier.companyName}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="supplier-table-footer">
          <span>
            Showing {suppliers.length ? (page - 1) * pageSize + 1 : 0}
            {"–"}
            {(page - 1) * pageSize + suppliers.length} of {total} suppliers
          </span>

          <div className="supplier-pagination">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
              disabled={page >= totalPages || loading}
              aria-label="Next page"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {showForm && (
        <div
          className="supplier-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="supplier-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-form-title"
          >
            <div className="supplier-modal-heading">
              <div>
                <div className="suppliers-eyebrow">
                  SUPPLIER MANAGEMENT
                </div>
                <h2 id="supplier-form-title">
                  {editingSupplier ? "Edit supplier" : "Add supplier"}
                </h2>
                <p>
                  Enter the supplier's business and contact details.
                </p>
              </div>

              <button
                type="button"
                className="supplier-icon-button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            {formError && (
              <div
                className="supplier-alert supplier-alert-error"
                role="alert"
              >
                <AlertCircle size={17} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="supplier-form-grid">
                <label className="supplier-form-field">
                  <span>Contact person *</span>
                  <input
                    name="supplierName"
                    value={form.supplierName}
                    onChange={handleFormChange}
                    placeholder="e.g. Rahul Sharma"
                    required
                    maxLength={100}
                  />
                </label>

                <label className="supplier-form-field">
                  <span>Company name *</span>
                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleFormChange}
                    placeholder="e.g. GreenTech Supplies Pvt Ltd"
                    required
                    maxLength={150}
                  />
                </label>

                <label className="supplier-form-field">
                  <span>Email address *</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="name@company.com"
                    required
                    maxLength={150}
                  />
                </label>

                <label className="supplier-form-field">
                  <span>Phone number</span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="e.g. 9876543210"
                    maxLength={20}
                  />
                </label>

                <label className="supplier-form-field">
                  <span>Category *</span>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    required
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="supplier-form-field">
                  <span>Status</span>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    {STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="supplier-form-field">
                  <span>Performance score (0–100)</span>
                  <input
                    type="number"
                    name="performanceScore"
                    value={form.performanceScore}
                    onChange={handleFormChange}
                    placeholder="Leave blank if not rated"
                    min="0"
                    max="100"
                  />
                </label>

                <label className="supplier-form-field supplier-form-full">
                  <span>Business address</span>
                  <div className="supplier-input-with-icon">
                    <MapPin size={16} />
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleFormChange}
                      placeholder="City, state, country"
                      maxLength={300}
                    />
                  </div>
                </label>

                <label className="supplier-form-field supplier-form-full">
                  <span>Notes</span>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="Additional supplier information..."
                    rows={3}
                    maxLength={1000}
                  />
                </label>
              </div>

              <div className="supplier-modal-footer">
                <button
                  type="button"
                  className="supplier-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="supplier-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="supplier-spinning"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingSupplier
                        ? "Save changes"
                        : "Create supplier"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
