
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Package,
  Truck,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Pencil,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import "./Deliveries.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const STATUSES = [
  "Ordered",
  "In Transit",
  "Delivered",
  "Delayed",
  "Cancelled",
];

const EMPTY_FORM = {
  deliveryNumber: "",
  supplier: "",
  contract: "",
  itemDescription: "",
  quantity: "1",
  orderValue: "",
  orderDate: "",
  expectedDeliveryDate: "",
  actualDeliveryDate: "",
  status: "Ordered",
  trackingNumber: "",
  notes: "",
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

function inputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function effectiveStatus(delivery) {
  if (["Delivered", "Cancelled"].includes(delivery.status)) {
    return delivery.status;
  }

  if (
    delivery.expectedDeliveryDate &&
    new Date(delivery.expectedDeliveryDate).setHours(0, 0, 0, 0) <
      new Date().setHours(0, 0, 0, 0)
  ) {
    return "Delayed";
  }

  return delivery.status || "Ordered";
}

function daysLabel(delivery) {
  if (effectiveStatus(delivery) === "Delivered") {
    const expected = new Date(delivery.expectedDeliveryDate);
    const actual = new Date(delivery.actualDeliveryDate);

    expected.setHours(0, 0, 0, 0);
    actual.setHours(0, 0, 0, 0);

    const difference = Math.round(
      (actual.getTime() - expected.getTime()) / 86400000
    );

    if (difference > 0) return `${difference} day(s) late`;
    if (difference < 0) return `${Math.abs(difference)} day(s) early`;
    return "Delivered on time";
  }

  if (effectiveStatus(delivery) === "Cancelled") return "Cancelled";

  if (!delivery.expectedDeliveryDate) return "No expected date";

  const expected = new Date(delivery.expectedDeliveryDate);
  const today = new Date();
  expected.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const days = Math.round((expected - today) / 86400000);

  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return "Due today";
  return `${days} day(s) remaining`;
}

function statusClass(status) {
  return `delivery-status delivery-status-${String(status)
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
}

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [deliveryResult, supplierResult, contractResult] =
        await Promise.all([
          apiRequest("/api/deliveries?limit=100"),
          apiRequest("/api/suppliers?limit=100"),
          apiRequest("/api/contracts?limit=100"),
        ]);

      setDeliveries(
        Array.isArray(deliveryResult.data) ? deliveryResult.data : []
      );
      setSuppliers(
        Array.isArray(supplierResult.data) ? supplierResult.data : []
      );
      setContracts(
        Array.isArray(contractResult.data) ? contractResult.data : []
      );
    } catch (err) {
      setError(err.message || "Unable to load deliveries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDeliveries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return deliveries.filter((delivery) => {
      const supplier = delivery.supplier || {};
      const contract = delivery.contract || {};

      const matchesSearch =
        !query ||
        [
          delivery.deliveryNumber,
          delivery.itemDescription,
          delivery.trackingNumber,
          supplier.supplierName,
          supplier.companyName,
          contract.contractNumber,
          contract.contractName,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      const matchesStatus =
        !statusFilter || effectiveStatus(delivery) === statusFilter;

      const supplierId =
        typeof delivery.supplier === "object"
          ? delivery.supplier?._id
          : delivery.supplier;

      const matchesSupplier =
        !supplierFilter || supplierId === supplierFilter;

      return matchesSearch && matchesStatus && matchesSupplier;
    });
  }, [deliveries, search, statusFilter, supplierFilter]);

  const stats = useMemo(() => {
    const totalValue = deliveries
      .filter((item) => effectiveStatus(item) !== "Cancelled")
      .reduce((sum, item) => sum + (Number(item.orderValue) || 0), 0);

    return {
      total: deliveries.length,
      pending: deliveries.filter((item) =>
        ["Ordered", "In Transit"].includes(effectiveStatus(item))
      ).length,
      completed: deliveries.filter(
        (item) => effectiveStatus(item) === "Delivered"
      ).length,
      delayed: deliveries.filter(
        (item) => effectiveStatus(item) === "Delayed"
      ).length,
      totalValue,
    };
  }, [deliveries]);

  const availableContracts = useMemo(() => {
    if (!form.supplier) return [];
    return contracts.filter((contract) => {
      const supplierId =
        typeof contract.supplier === "object"
          ? contract.supplier?._id
          : contract.supplier;
      return supplierId === form.supplier;
    });
  }, [contracts, form.supplier]);

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

  function openEditModal(delivery) {
    setEditingId(delivery._id);

    const supplierId =
      typeof delivery.supplier === "object"
        ? delivery.supplier?._id || ""
        : delivery.supplier || "";

    const contractId =
      typeof delivery.contract === "object"
        ? delivery.contract?._id || ""
        : delivery.contract || "";

    setForm({
      deliveryNumber: delivery.deliveryNumber || "",
      supplier: supplierId,
      contract: contractId,
      itemDescription: delivery.itemDescription || "",
      quantity: delivery.quantity ?? 1,
      orderValue: delivery.orderValue ?? "",
      orderDate: inputDate(delivery.orderDate),
      expectedDeliveryDate: inputDate(delivery.expectedDeliveryDate),
      actualDeliveryDate: inputDate(delivery.actualDeliveryDate),
      status: delivery.status || "Ordered",
      trackingNumber: delivery.trackingNumber || "",
      notes: delivery.notes || "",
    });

    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "supplier" ? { contract: "" } : {}),
      ...(name === "status" && value === "Delivered"
        ? {}
        : name === "status"
          ? { actualDeliveryDate: "" }
          : {}),
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

    if (
      form.expectedDeliveryDate < form.orderDate
    ) {
      setError("Expected delivery date cannot be before the order date.");
      return;
    }

    if (
      form.status === "Delivered" &&
      !form.actualDeliveryDate
    ) {
      setError("Please enter the actual delivery date.");
      return;
    }

    if (
      form.actualDeliveryDate &&
      form.actualDeliveryDate < form.orderDate
    ) {
      setError("Actual delivery date cannot be before the order date.");
      return;
    }

    const payload = {
      ...form,
      contract: form.contract || null,
      quantity: Number(form.quantity),
      orderValue: Number(form.orderValue),
      actualDeliveryDate: form.actualDeliveryDate || null,
    };

    setSaving(true);

    try {
      if (editingId) {
        await apiRequest(`/api/deliveries/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Delivery updated successfully.");
      } else {
        await apiRequest("/api/deliveries", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Delivery created successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save delivery.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(delivery) {
    const confirmed = window.confirm(
      `Delete delivery "${delivery.deliveryNumber}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`/api/deliveries/${delivery._id}`, {
        method: "DELETE",
      });
      setNotice("Delivery deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete delivery.");
    }
  }

  return (
    <div className="deliveries-page">
      <section className="deliveries-page-heading">
        <div>
          <p className="deliveries-eyebrow">
            SUPPLIER RELATIONSHIP MANAGEMENT
          </p>
          <h1>Deliveries</h1>
          <p className="deliveries-subtitle">
            Track supplier orders, delivery timelines, and fulfilment performance.
          </p>
        </div>

        <button
          type="button"
          className="deliveries-primary-button"
          onClick={openCreateModal}
          disabled={suppliers.length === 0}
        >
          <Plus size={17} /> Add Delivery
        </button>
      </section>

      {error && !modalOpen && (
        <div className="deliveries-alert deliveries-alert-error">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {notice && !modalOpen && (
        <div className="deliveries-alert deliveries-alert-success">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="deliveries-stats">
        <article className="deliveries-stat-card">
          <span>Total deliveries</span>
          <div><strong>{stats.total}</strong><Package size={21} /></div>
          <small>All registered delivery records</small>
        </article>

        <article className="deliveries-stat-card">
          <span>Pending deliveries</span>
          <div><strong>{stats.pending}</strong><Truck size={21} /></div>
          <small>Ordered or in transit</small>
        </article>

        <article className="deliveries-stat-card">
          <span>Completed deliveries</span>
          <div><strong>{stats.completed}</strong><CheckCircle2 size={21} /></div>
          <small>Marked as delivered</small>
        </article>

        <article className="deliveries-stat-card">
          <span>Delayed deliveries</span>
          <div><strong>{stats.delayed}</strong><Clock3 size={21} /></div>
          <small>Past expected date or marked delayed</small>
        </article>

        <article className="deliveries-stat-card deliveries-value-card">
          <span>Total order value</span>
          <div><strong>{currency(stats.totalValue)}</strong><IndianRupee size={21} /></div>
          <small>Excludes cancelled deliveries</small>
        </article>
      </section>

      <section className="deliveries-directory">
        <div className="deliveries-directory-heading">
          <div>
            <h2>Delivery directory</h2>
            <p>Search and manage your supplier delivery records.</p>
          </div>
          <button
            type="button"
            className="deliveries-secondary-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "deliveries-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="deliveries-filters">
          <label className="deliveries-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search delivery, item, supplier, or tracking..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter by delivery status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            aria-label="Filter by supplier"
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.supplierName}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="deliveries-message">
            <RefreshCw size={23} className="deliveries-spin" />
            <p>Loading deliveries…</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="deliveries-message">
            <Package size={30} />
            <h3>{deliveries.length ? "No matching deliveries" : "No deliveries yet"}</h3>
            <p>
              {deliveries.length
                ? "Try changing your search or filters."
                : "Create your first delivery record to start tracking fulfilment."}
            </p>
            {!deliveries.length && (
              <button
                type="button"
                className="deliveries-primary-button"
                onClick={openCreateModal}
                disabled={suppliers.length === 0}
              >
                <Plus size={16} /> Add your first delivery
              </button>
            )}
            {suppliers.length === 0 && (
              <small>Add a supplier first, then create a delivery.</small>
            )}
          </div>
        ) : (
          <div className="deliveries-table-wrap">
            <table className="deliveries-table">
              <thead>
                <tr>
                  <th>DELIVERY</th>
                  <th>SUPPLIER</th>
                  <th>ORDER VALUE</th>
                  <th>EXPECTED DATE</th>
                  <th>DELIVERY TRACKING</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((delivery) => {
                  const supplier = delivery.supplier || {};
                  const contract = delivery.contract || {};
                  const status = effectiveStatus(delivery);
                  const timing = daysLabel(delivery);
                  const warning = ["Delayed"].includes(status) ||
                    timing.includes("late") ||
                    timing.includes("overdue");

                  return (
                    <tr key={delivery._id}>
                      <td>
                        <div className="deliveries-name-cell">
                          <div className="deliveries-avatar">
                            <Package size={17} />
                          </div>
                          <div>
                            <strong>{delivery.deliveryNumber}</strong>
                            <small>{delivery.itemDescription}</small>
                            <small>{delivery.quantity} unit(s)</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong className="deliveries-supplier-name">
                          {supplier.supplierName || "Supplier unavailable"}
                        </strong>
                        <small className="deliveries-muted">
                          {supplier.companyName || ""}
                        </small>
                        {contract.contractNumber && (
                          <small className="deliveries-muted">
                            Contract: {contract.contractNumber}
                          </small>
                        )}
                      </td>
                      <td className="deliveries-value">
                        {currency(delivery.orderValue)}
                      </td>
                      <td>
                        <span>{formatDate(delivery.expectedDeliveryDate)}</span>
                        <small className="deliveries-muted">
                          Ordered: {formatDate(delivery.orderDate)}
                        </small>
                      </td>
                      <td>
                        <span className={warning ? "deliveries-timing-warning" : ""}>
                          {timing}
                        </span>
                        {delivery.trackingNumber && (
                          <small className="deliveries-muted">
                            Tracking: {delivery.trackingNumber}
                          </small>
                        )}
                        {delivery.actualDeliveryDate && (
                          <small className="deliveries-muted">
                            Delivered: {formatDate(delivery.actualDeliveryDate)}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={statusClass(status)}>{status}</span>
                      </td>
                      <td>
                        <div className="deliveries-actions">
                          <button
                            type="button"
                            className="deliveries-action-button"
                            title="Edit delivery"
                            aria-label={`Edit ${delivery.deliveryNumber}`}
                            onClick={() => openEditModal(delivery)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="deliveries-action-button deliveries-delete-button"
                            title="Delete delivery"
                            aria-label={`Delete ${delivery.deliveryNumber}`}
                            onClick={() => handleDelete(delivery)}
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

        {!loading && filteredDeliveries.length > 0 && (
          <div className="deliveries-table-footer">
            Showing {filteredDeliveries.length} of {deliveries.length} deliveries
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="deliveries-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <section
            className="deliveries-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-modal-title"
          >
            <div className="deliveries-modal-heading">
              <div>
                <p className="deliveries-eyebrow">DELIVERY MANAGEMENT</p>
                <h2 id="delivery-modal-title">
                  {editingId ? "Edit delivery" : "Add new delivery"}
                </h2>
                <p>Enter the supplier order and delivery details.</p>
              </div>
              <button
                type="button"
                className="deliveries-action-button"
                aria-label="Close form"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="deliveries-alert deliveries-alert-error">
                <AlertCircle size={17} /><span>{error}</span>
              </div>
            )}

            {suppliers.length === 0 && (
              <div className="deliveries-alert deliveries-alert-error">
                Add a supplier first. Every delivery must be linked to a supplier.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="deliveries-form-grid">
                <label>
                  Delivery number *
                  <input
                    name="deliveryNumber"
                    value={form.deliveryNumber}
                    onChange={updateField}
                    placeholder="e.g. PP-DEL-001"
                    required
                  />
                </label>

                <label>
                  Supplier *
                  <select
                    name="supplier"
                    value={form.supplier}
                    onChange={updateField}
                    required
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.supplierName} — {supplier.companyName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="deliveries-form-full">
                  Related contract (optional)
                  <select
                    name="contract"
                    value={form.contract}
                    onChange={updateField}
                  >
                    <option value="">No contract linked</option>
                    {availableContracts.map((contract) => (
                      <option key={contract._id} value={contract._id}>
                        {contract.contractNumber} — {contract.contractName}
                      </option>
                    ))}
                  </select>
                  {form.supplier && availableContracts.length === 0 && (
                    <small>No contracts found for this supplier.</small>
                  )}
                </label>

                <label className="deliveries-form-full">
                  Item / order description *
                  <input
                    name="itemDescription"
                    value={form.itemDescription}
                    onChange={updateField}
                    placeholder="e.g. Packaging materials, office equipment"
                    required
                  />
                </label>

                <label>
                  Quantity *
                  <input
                    name="quantity"
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.quantity}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  Order value (₹) *
                  <input
                    name="orderValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.orderValue}
                    onChange={updateField}
                    placeholder="25000"
                    required
                  />
                </label>

                <label>
                  Order date *
                  <input
                    name="orderDate"
                    type="date"
                    value={form.orderDate}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  Expected delivery date *
                  <input
                    name="expectedDeliveryDate"
                    type="date"
                    min={form.orderDate || undefined}
                    value={form.expectedDeliveryDate}
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
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Actual delivery date
                  <input
                    name="actualDeliveryDate"
                    type="date"
                    min={form.orderDate || undefined}
                    value={form.actualDeliveryDate}
                    onChange={updateField}
                    required={form.status === "Delivered"}
                    disabled={form.status !== "Delivered"}
                  />
                </label>

                <label className="deliveries-form-full">
                  Tracking number (optional)
                  <input
                    name="trackingNumber"
                    value={form.trackingNumber}
                    onChange={updateField}
                    placeholder="Enter shipment tracking number"
                  />
                </label>

                <label className="deliveries-form-full">
                  Notes (optional)
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={updateField}
                    rows="3"
                    placeholder="Add delivery instructions or observations..."
                  />
                </label>
              </div>

              <div className="deliveries-form-actions">
                <button
                  type="button"
                  className="deliveries-secondary-button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="deliveries-primary-button"
                  disabled={saving || suppliers.length === 0}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create delivery"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
