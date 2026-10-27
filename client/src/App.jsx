
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  Clock3,
  BellRing,
  AlertTriangle,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  PackageCheck,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";

import Suppliers from "./Suppliers.jsx";
import Contracts from "./Contracts.jsx";
import Deliveries from "./Deliveries.jsx";
import Evaluations from "./Evaluations.jsx";
import Analytics from "./Analytics.jsx";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Suppliers", icon: Building2 },
  { label: "Contracts", icon: FileText },
  { label: "Deliveries", icon: Truck },
  { label: "Evaluations", icon: ClipboardCheck },
  { label: "Analytics", icon: BarChart3 },
];

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [apiOnline, setApiOnline] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dashboardMetrics, setDashboardMetrics] = useState({
    activeContracts: null,
    totalEvaluations: null,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState("");

  const [renewalContracts, setRenewalContracts] = useState([]);
  const [renewalsLoading, setRenewalsLoading] = useState(true);
  const [renewalsError, setRenewalsError] = useState("");

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/suppliers`);

      if (!response.ok) {
        throw new Error("Could not load suppliers.");
      }

      const result = await response.json();

      const records = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      setSuppliers(records);
      setApiOnline(true);
    } catch (err) {
      setApiOnline(false);
      setError(
        err.message || "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load real contract and evaluation counts from the analytics API.
  const loadDashboardMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError("");

    try {
      const response = await fetch(
        `${API_URL}/api/analytics/overview?range=30d`
      );

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error("The analytics API returned invalid data.");
      }

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message ||
            `Could not load dashboard metrics (HTTP ${response.status}).`
        );
      }

      const summary = result.data.summary || {};

      setDashboardMetrics({
        activeContracts:
          Number.isFinite(Number(summary.activeContracts))
            ? Number(summary.activeContracts)
            : null,
        totalEvaluations:
          Number.isFinite(Number(summary.totalEvaluations))
            ? Number(summary.totalEvaluations)
            : null,
      });

      setApiOnline(true);
    } catch (err) {
      setMetricsError(
        err.message || "Unable to load dashboard metrics."
      );
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Load contract renewal information from the analytics API.
  const loadRenewals = useCallback(async () => {
    setRenewalsLoading(true);
    setRenewalsError("");

    try {
      const response = await fetch(
        `${API_URL}/api/analytics/overview?range=30d`
      );

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The analytics API returned an invalid response."
        );
      }

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message ||
            `Could not load renewal alerts (HTTP ${response.status}).`
        );
      }

      setRenewalContracts(
        Array.isArray(result.data.renewalContracts)
          ? result.data.renewalContracts
          : []
      );
    } catch (err) {
      setRenewalsError(
        err.message || "Unable to load contract renewal alerts."
      );
    } finally {
      setRenewalsLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(() => {
    loadSuppliers();
    loadDashboardMetrics();
    loadRenewals();
  }, [loadSuppliers, loadDashboardMetrics, loadRenewals]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const activeSuppliers = suppliers.filter(
    (supplier) =>
      String(supplier.status || "").toLowerCase() === "active"
  ).length;

  const supplierCategories = new Set(
    suppliers
      .map((supplier) => supplier.category)
      .filter(Boolean)
  ).size;

  const pageDescriptions = {
    Overview:
      "Monitor supplier performance, contracts, and operational reliability.",
    Suppliers: "View and maintain your supplier directory.",
    Contracts:
      "Track agreements, contract periods, and renewal dates.",
    Deliveries:
      "Monitor delivery records and supplier reliability.",
    Evaluations:
      "Review supplier performance and evaluation results.",
    Analytics:
      "Explore supplier performance, contract renewals, delivery trends, and business insights.",
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={25} />
          </div>

          <div>
            <h2>PartnerPulse</h2>
            <span>SUPPLIER INTELLIGENCE</span>
          </div>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <nav className="navigation" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={`nav-item ${
                activePage === label ? "active" : ""
              }`}
              onClick={() => setActivePage(label)}
              aria-current={
                activePage === label ? "page" : undefined
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Contract Renewal Alerts */}
        <div className="sidebar-bottom renewal-sidebar-panel">
          <div className="renewal-sidebar-heading">
            <BellRing size={20} />
            <strong>Contract Renewal Alerts</strong>
          </div>

          {renewalsLoading ? (
            <p className="renewal-sidebar-muted">
              Checking contract dates…
            </p>
          ) : renewalsError ? (
            <div>
              <p className="renewal-sidebar-muted">
                Renewal alerts are temporarily unavailable.
              </p>

              <button
                type="button"
                className="renewal-sidebar-button"
                onClick={loadRenewals}
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          ) : renewalContracts.length === 0 ? (
            <div className="renewal-sidebar-empty">
              <span className="renewal-sidebar-count">0</span>
              <p>No contracts needing attention.</p>
            </div>
          ) : (
            <>
              <div className="renewal-sidebar-summary">
                <span className="renewal-sidebar-count">
                  {renewalContracts.length}
                </span>

                <p>
                  contract
                  {renewalContracts.length === 1 ? "" : "s"}{" "}
                  needing attention
                </p>
              </div>

              <div className="renewal-sidebar-list">
                {renewalContracts.slice(0, 3).map((contract) => (
                  <div
                    className={`renewal-sidebar-item renewal-${
                      contract.alertType || "upcoming"
                    }`}
                    key={contract._id}
                  >
                    <span className="renewal-sidebar-alert-icon">
                      <AlertTriangle size={14} />
                    </span>

                    <div className="renewal-sidebar-item-copy">
                      <strong>
                        {contract.contractName ||
                          contract.contractNumber ||
                          "Untitled contract"}
                      </strong>

                      <span>
                        {contract.alertMessage ||
                          (Number(contract.daysRemaining) === 0
                            ? "Due today"
                            : Number(contract.daysRemaining) < 0
                              ? `${Math.abs(
                                  Number(contract.daysRemaining)
                                )} days overdue`
                              : `${contract.daysRemaining} days left`)}
                      </span>

                      {contract.supplierName && (
                        <small>{contract.supplierName}</small>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="renewal-sidebar-button"
                onClick={() => setActivePage("Contracts")}
              >
                View contracts
                <ChevronRight size={15} />
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace / <strong>{activePage}</strong>
          </div>

          <div className="top-actions">
            <div
              className={`api-badge ${
                apiOnline ? "connected" : "offline"
              }`}
            >
              <span className="status-dot" />
              {apiOnline ? "API Connected" : "API Offline"}
            </div>

            <button
              type="button"
              className="icon-button"
              aria-label="Refresh dashboard data"
              onClick={refreshDashboard}
              title="Refresh dashboard data"
              disabled={loading || metricsLoading || renewalsLoading}
            >
              <RefreshCw size={18} />
            </button>

            <div className="avatar">PP</div>
          </div>
        </header>

        <div className="page-content">
          {activePage === "Suppliers" ? (
            <Suppliers />
          ) : activePage === "Contracts" ? (
            <Contracts />
          ) : activePage === "Deliveries" ? (
            <Deliveries />
          ) : activePage === "Evaluations" ? (
            <Evaluations />
          ) : activePage === "Analytics" ? (
            <Analytics />
          ) : activePage === "Overview" ? (
            <>
              <section className="welcome-row">
                <div>
                  <p className="eyebrow">
                    SUPPLIER RELATIONSHIP MANAGEMENT
                  </p>

                  <h1>Overview</h1>

                  <p className="subtitle">
                    {pageDescriptions.Overview}
                  </p>
                </div>
              </section>

              <section className="welcome-banner">
                <div className="banner-copy">
                  <span className="banner-label">
                    WELCOME TO PARTNERPULSE
                  </span>

                  <h2>Your supplier data, all in one place.</h2>

                  <p>
                    Build a clearer picture of supplier performance
                    and make better-informed business decisions.
                  </p>
                </div>

                <div className="banner-art">
                  <Building2 size={64} strokeWidth={1.5} />
                </div>
              </section>

              <section className="section-heading">
                <h2>Performance snapshot</h2>

                <p>
                  Metrics based on your database records.
                </p>
              </section>

              {error && (
                <div className="error-message">
                  {error} Make sure your backend is running
                  on port 5000.
                </div>
              )}

              {metricsError && (
                <div className="error-message">
                  {metricsError}
                  <button
                    type="button"
                    className="refresh-button"
                    onClick={loadDashboardMetrics}
                    style={{ marginLeft: "12px" }}
                  >
                    Retry
                  </button>
                </div>
              )}

              <section className="metrics-grid">
                <MetricCard
                  label="Total suppliers"
                  value={loading ? "…" : suppliers.length}
                  description="Registered suppliers"
                  icon={Users}
                />

                <MetricCard
                  label="Active suppliers"
                  value={loading ? "…" : activeSuppliers}
                  description="Currently marked active"
                  icon={Building2}
                />

                <MetricCard
                  label="Active contracts"
                  value={
                    metricsLoading
                      ? "…"
                      : dashboardMetrics.activeContracts ?? "—"
                  }
                  description="Active agreements in the analytics data"
                  icon={PackageCheck}
                  onClick={() => setActivePage("Contracts")}
                />

                <MetricCard
                  label="Evaluations"
                  value={
                    metricsLoading
                      ? "…"
                      : dashboardMetrics.totalEvaluations ?? "—"
                  }
                  description="Supplier performance reviews"
                  icon={ClipboardCheck}
                  onClick={() => setActivePage("Evaluations")}
                />
              </section>

              <section className="panel supplier-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent suppliers</h2>

                    <p>
                      Supplier records retrieved from MongoDB.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="refresh-button"
                    onClick={loadSuppliers}
                    disabled={loading}
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="table-message">
                    Loading supplier records…
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="table-message">
                    <Users size={30} />
                    <h3>No suppliers found</h3>

                    <p>
                      Add your first supplier to start building your
                      supplier directory.
                    </p>

                    <button
                      type="button"
                      className="refresh-button"
                      onClick={() => setActivePage("Suppliers")}
                    >
                      Open Suppliers
                      <ChevronRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="supplier-table">
                      <thead>
                        <tr>
                          <th>SUPPLIER</th>
                          <th>CATEGORY</th>
                          <th>EMAIL</th>
                          <th>STATUS</th>
                          <th>PERFORMANCE</th>
                        </tr>
                      </thead>

                      <tbody>
                        {suppliers.slice(0, 5).map((supplier) => (
                          <tr key={supplier._id}>
                            <td>
                              <div className="supplier-name">
                                <div className="supplier-avatar">
                                  {(
                                    supplier.companyName ||
                                    supplier.supplierName ||
                                    "S"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <strong>
                                    {supplier.supplierName ||
                                      "Unnamed supplier"}
                                  </strong>

                                  <span>
                                    {supplier.companyName || "—"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>{supplier.category || "—"}</td>
                            <td>{supplier.email || "—"}</td>

                            <td>
                              <span
                                className={`status-pill ${
                                  String(supplier.status || "")
                                    .toLowerCase() === "active"
                                    ? "status-active"
                                    : ""
                                }`}
                              >
                                {supplier.status || "Unknown"}
                              </span>
                            </td>

                            <td>
                              {supplier.performanceScore ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="content-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Business analytics</h2>

                      <p>
                        Performance trends and supplier comparisons
                      </p>
                    </div>

                    <button
                      type="button"
                      className="refresh-button"
                      onClick={() => setActivePage("Analytics")}
                    >
                      Open Analytics
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="empty-chart">
                    <div className="chart-symbol">
                      <Activity size={26} />
                    </div>

                    <h3>Explore your business insights</h3>

                    <p>
                      View supplier rankings, delivery reliability,
                      contract renewal alerts, and recent evaluations
                      on the Analytics page.
                    </p>

                    <button
                      type="button"
                      className="refresh-button"
                      onClick={() => setActivePage("Analytics")}
                    >
                      View Analytics
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="panel setup-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Supplier activity</h2>

                      <p>
                        A quick look at your supplier directory
                      </p>
                    </div>

                    <Clock3 size={21} />
                  </div>

                  {loading ? (
                    <div className="table-message">
                      Loading supplier activity…
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="table-message">
                      <Users size={30} />

                      <h3>No supplier activity yet</h3>

                      <p>
                        Add suppliers to see a summary of your
                        directory here.
                      </p>

                      <button
                        type="button"
                        className="refresh-button"
                        onClick={() => setActivePage("Suppliers")}
                      >
                        Add a supplier
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="activity-list">
                      <div className="activity-summary">
                        <div className="activity-summary-icon">
                          <Users size={19} />
                        </div>

                        <div>
                          <strong>
                            {suppliers.length} supplier
                            {suppliers.length === 1 ? "" : "s"}{" "}
                            registered
                          </strong>

                          <p>
                            Supplier records currently in your
                            database
                          </p>
                        </div>
                      </div>

                      <div className="activity-summary">
                        <div className="activity-summary-icon">
                          <Building2 size={19} />
                        </div>

                        <div>
                          <strong>
                            {activeSuppliers} active supplier
                            {activeSuppliers === 1 ? "" : "s"}
                          </strong>

                          <p>
                            {suppliers.length - activeSuppliers}{" "}
                            supplier
                            {suppliers.length - activeSuppliers === 1
                              ? ""
                              : "s"}{" "}
                            with another or unspecified status
                          </p>
                        </div>
                      </div>

                      <div className="activity-summary">
                        <div className="activity-summary-icon">
                          <PackageCheck size={19} />
                        </div>

                        <div>
                          <strong>Supplier categories</strong>

                          <p>
                            {supplierCategories} distinct categor
                            {supplierCategories === 1 ? "y" : "ies"}{" "}
                            represented
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="refresh-button"
                        onClick={() => setActivePage("Suppliers")}
                        style={{ marginTop: "12px" }}
                      >
                        View all suppliers
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="panel placeholder-panel">
              <div className="placeholder-icon">
                <ClipboardCheck size={27} />
              </div>

              <h2>{activePage} workspace</h2>

              <p>This workspace is not connected yet.</p>

              <button
                type="button"
                className="refresh-button"
                onClick={() => setActivePage("Suppliers")}
              >
                View suppliers
                <ChevronRight size={16} />
              </button>
            </section>
          )}

          <footer className="page-footer">
            <span>PartnerPulse © 2026</span>

            <span>
              Supplier Relationship &amp; Performance Analytics
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  onClick,
}) {
  const content = (
    <>
      <div className="metric-top">
        <span>{label}</span>

        <div className="metric-icon">
          <Icon size={19} />
        </div>
      </div>

      <div className="metric-value">{value}</div>

      <p>{description}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="metric-card metric-card-clickable"
        onClick={onClick}
        style={{
          width: "100%",
          textAlign: "left",
          font: "inherit",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        {content}
      </button>
    );
  }

  return <article className="metric-card">{content}</article>;
}

export default App;
