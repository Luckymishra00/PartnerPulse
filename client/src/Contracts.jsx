
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  FileText,
  CalendarDays,
  IndianRupee,
  Clock3,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import "./Contracts.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const CONTRACT_TYPES = [
  "Supply Agreement",
  "Service Agreement",
  "Maintenance",
  "Partnership",
  "Other",
];

const CONTRACT_STATUSES = [
  "Draft",
  "Active",
  "Expired",
  "Renewed",
  "Terminated",
];

const emptyForm = {
  contractNumber: "",
  contractName: "",
  supplier: "",
  contractType: "Supply Agreement",
  contractValue: "",
  startDate: "",
  expiryDate: "",
  status: "Draft",
  renewalNoticeDays: 30,
  description: "",
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "The request failed.");
  }

  return result;
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function effectiveStatus(contract) {
  if (["Draft", "Renewed", "Terminated"].includes(contract.status)) {
    return contract.status;
  }

  if (contract.expiryDate) {
    const expiry = new Date(contract.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) return "Expired";
  }

  return contract.status || "Draft";
}

function expiryLabel(contract) {
  if (!contract.expiryDate) return "No expiry date";

  const expiry = new Date(contract.expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (days < 0) return `Expired ${Math.abs(days)} day(s) ago`;
  if (days === 0) return "Expires today";
  if (days <= (Number(contract.renewalNoticeDays) || 30)) {
    return `Renewal due in ${days} day(s)`;
  }

  return `${days} day(s) remaining`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function statusClass(status) {
  return `contract-status contract-status-${String(status)
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
}

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [contractResult, supplierResult] = await Promise.all([
        apiRequest("/api/contracts?limit=100"),
        apiRequest("/api/suppliers?limit=100"),
      ]);

      setContracts(
        Array.isArray(contractResult.data) ? contractResult.data : []
      );
      setSuppliers(
        Array.isArray(supplierResult.data) ? supplierResult.data : []
      );
    } catch (err) {
      setError(err.message || "Unable to load contracts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredContracts = contracts.filter((contract) => {
    const query = search.trim().toLowerCase();
    const supplier = contract.supplier || {};

    const matchesSearch =
      !query ||
      [
        contract.contractNumber,
        contract.contractName,
        contract.description,
        supplier.supplierName,
        supplier.companyName,
      ].some((value) => String(value || "").toLowerCase().includes(query));

    const matchesStatus =
      !statusFilter || effectiveStatus(contract) === statusFilter;

    const matchesType =
      !typeFilter || contract.contractType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const activeCount = contracts.filter(
    (contract) => effectiveStatus(contract) === "Active"
  ).length;

  const renewalCount = contracts.filter((contract) => {
    const status = effectiveStatus(contract);
    if (status !== "Active") return false;

    const expiry = new Date(contract.expiryDate);
    if (Number.isNaN(expiry.getTime())) return false;

    const days = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= (Number(contract.renewalNoticeDays) || 30);
  }).length;

  const totalValue = contracts
    .filter((contract) => effectiveStatus(contract) === "Active")
    .reduce((sum, contract) => sum + (Number(contract.contractValue) || 0), 0);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      supplier: suppliers[0]?._id || "",
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(contract) {
    setEditingId(contract._id);
    setForm({
      contractNumber: contract.contractNumber || "",
      contractName: contract.contractName || "",
      supplier:
        typeof contract.supplier === "object"
          ? contract.supplier?._id || ""
          : contract.supplier || "",
      contractType: contract.contractType || "Supply Agreement",
      contractValue: contract.contractValue ?? "",
      startDate: dateInputValue(contract.startDate),
      expiryDate: dateInputValue(contract.expiryDate),
      status: contract.status || "Draft",
      renewalNoticeDays: contract.renewalNoticeDays ?? 30,
      description: contract.description || "",
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    if (!form.supplier) {
      setError("Please select a supplier.");
      setSaving(false);
      return;
    }

    if (new Date(form.expiryDate) < new Date(form.startDate)) {
      setError("Expiry date must be on or after the start date.");
      setSaving(false);
      return;
    }

    const payload = {
      ...form,
      contractValue: Number(form.contractValue),
      renewalNoticeDays: Number(form.renewalNoticeDays),
    };

    try {
      if (editingId) {
        await apiRequest(`/api/contracts/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Contract updated successfully.");
      } else {
        await apiRequest("/api/contracts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Contract created successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not save the contract.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contract) {
    const confirmed = window.confirm(
      `Delete contract "${contract.contractName}" (${contract.contractNumber})? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`/api/contracts/${contract._id}`, {
        method: "DELETE",
      });
      setNotice("Contract deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not delete the contract.");
    }
  }

  return (
    <div className="contracts-page">
      <section className="contracts-page-heading">
        <div>
          <p className="contracts-eyebrow">SUPPLIER RELATIONSHIP MANAGEMENT</p>
          <h1>Contracts</h1>
          <p className="contracts-subtitle">
            Track agreements, contract values, expiry dates, and renewals.
          </p>
        </div>

        <button
          type="button"
          className="contracts-primary-button"
          onClick={openCreateModal}
        >
          <Plus size={17} />
          Add Contract
        </button>
      </section>

      {error && !modalOpen && (
        <div className="contracts-alert contracts-alert-error">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {notice && !modalOpen && (
        <div className="contracts-alert contracts-alert-success">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="contracts-stats">
        <article className="contracts-stat-card">
          <span>Total contracts</span>
          <div><strong>{contracts.length}</strong><FileText size={21} /></div>
          <small>All registered agreements</small>
        </article>

        <article className="contracts-stat-card">
          <span>Active contracts</span>
          <div><strong>{activeCount}</strong><CheckCircle2 size={21} /></div>
          <small>Currently active agreements</small>
        </article>

        <article className="contracts-stat-card">
          <span>Active contract value</span>
          <div><strong>{formatCurrency(totalValue)}</strong><IndianRupee size={21} /></div>
          <small>Total value of active contracts</small>
        </article>

        <article className="contracts-stat-card">
          <span>Renewals approaching</span>
          <div><strong>{renewalCount}</strong><Clock3 size={21} /></div>
          <small>Within the renewal notice period</small>
        </article>
      </section>

      <section className="contracts-directory">
        <div className="contracts-directory-heading">
          <div>
            <h2>Contract directory</h2>
            <p>Contracts retrieved from your MongoDB database.</p>
          </div>
          <button
            type="button"
            className="contracts-secondary-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "contracts-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="contracts-filters">
          <label className="contracts-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search contract, number, or supplier..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter by contract type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">All contract types</option>
            {CONTRACT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {CONTRACT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="contracts-message">
            <RefreshCw size={23} className="contracts-spin" />
            <p>Loading contracts from MongoDB…</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="contracts-message">
            <FileText size={30} />
            <h3>{contracts.length ? "No matching contracts" : "No contracts yet"}</h3>
            <p>
              {contracts.length
                ? "Try changing your search or filters."
                : "Your saved contracts will appear here after you add them."}
            </p>
            {!contracts.length && (
              <button
                type="button"
                className="contracts-primary-button"
                onClick={openCreateModal}
              >
                <Plus size={16} /> Add your first contract
              </button>
            )}
          </div>
        ) : (
          <div className="contracts-table-wrap">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>CONTRACT</th>
                  <th>SUPPLIER</th>
                  <th>VALUE</th>
                  <th>PERIOD</th>
                  <th>EXPIRY / RENEWAL</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => {
                  const supplier = contract.supplier || {};
                  const status = effectiveStatus(contract);
                  const dueText = expiryLabel(contract);
                  const renewalWarning =
                    dueText.startsWith("Renewal due") ||
                    dueText.startsWith("Expires today") ||
                    dueText.startsWith("Expired");

                  return (
                    <tr key={contract._id}>
                      <td>
                        <div className="contracts-name-cell">
                          <div className="contracts-avatar"><FileText size={17} /></div>
                          <div>
                            <strong>{contract.contractName}</strong>
                            <small>{contract.contractNumber}</small>
                            <small>{contract.contractType}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong className="contracts-supplier-name">
                          {supplier.supplierName || "Supplier unavailable"}
                        </strong>
                        <small className="contracts-muted">
                          {supplier.companyName || ""}
                        </small>
                      </td>
                      <td className="contracts-value">
                        {formatCurrency(contract.contractValue)}
                      </td>
                      <td>
                        <span>{formatDate(contract.startDate)}</span>
                        <small className="contracts-muted">
                          to {formatDate(contract.expiryDate)}
                        </small>
                      </td>
                      <td>
                        <span className={renewalWarning ? "contracts-expiry-warning" : ""}>
                          {dueText}
                        </span>
                        <small className="contracts-muted">
                          Notice: {contract.renewalNoticeDays ?? 30} days
                        </small>
                      </td>
                      <td><span className={statusClass(status)}>{status}</span></td>
                      <td>
                        <div className="contracts-actions">
                          <button
                            type="button"
                            className="contracts-action-button"
                            title="Edit contract"
                            aria-label={`Edit ${contract.contractName}`}
                            onClick={() => openEditModal(contract)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="contracts-action-button contracts-delete-button"
                            title="Delete contract"
                            aria-label={`Delete ${contract.contractName}`}
                            onClick={() => handleDelete(contract)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredContracts.length > 0 && (
          <div className="contracts-table-footer">
            Showing {filteredContracts.length} of {contracts.length} contracts
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="contracts-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <section
            className="contracts-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contract-modal-title"
          >
            <div className="contracts-modal-heading">
              <div>
                <p className="contracts-eyebrow">CONTRACT MANAGEMENT</p>
                <h2 id="contract-modal-title">
                  {editingId ? "Edit contract" : "Add new contract"}
                </h2>
                <p>Enter the agreement details below.</p>
              </div>
              <button
                type="button"
                className="contracts-action-button"
                aria-label="Close form"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="contracts-alert contracts-alert-error">
                <AlertCircle size={17} /> <span>{error}</span>
              </div>
            )}

            {suppliers.length === 0 && (
              <div className="contracts-alert contracts-alert-error">
                Add a supplier first. Contracts must be linked to an existing supplier.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="contracts-form-grid">
                <label>
                  Contract number *
                  <input
                    name="contractNumber"
                    value={form.contractNumber}
                    onChange={updateField}
                    placeholder="e.g. PP-CON-002"
                    required
                  />
                </label>

                <label>
                  Contract name *
                  <input
                    name="contractName"
                    value={form.contractName}
                    onChange={updateField}
                    placeholder="Annual supply agreement"
                    required
                  />
                </label>

                <label className="contracts-form-full">
                  Supplier *
                  <select
                    name="supplier"
                    value={form.supplier}
                    onChange={updateField}
                    required
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.supplierName} — {supplier.companyName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Contract type *
                  <select
                    name="contractType"
                    value={form.contractType}
                    onChange={updateField}
                    required
                  >
                    {CONTRACT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Contract value (₹) *
                  <input
                    name="contractValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.contractValue}
                    onChange={updateField}
                    placeholder="150000"
                    required
                  />
                </label>

                <label>
                  Start date *
                  <input
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  Expiry date *
                  <input
                    name="expiryDate"
                    type="date"
                    min={form.startDate || undefined}
                    value={form.expiryDate}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  Status *
                  <select
                    name="status"
                    value={form.status}
                    onChange={updateField}
                    required
                  >
                    {CONTRACT_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Renewal notice (days)
                  <input
                    name="renewalNoticeDays"
                    type="number"
                    min="0"
                    value={form.renewalNoticeDays}
                    onChange={updateField}
                  />
                </label>

                <label className="contracts-form-full">
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    rows="3"
                    placeholder="Add notes about the agreement..."
                  />
                </label>
              </div>

              <div className="contracts-form-actions">
                <button
                  type="button"
                  className="contracts-secondary-button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="contracts-primary-button"
                  disabled={saving || suppliers.length === 0}
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Create contract"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
