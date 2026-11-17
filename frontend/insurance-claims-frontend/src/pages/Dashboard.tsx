import { useEffect, useState } from "react";
import { getAllPolicies } from "../services/policyService";
import { getAllClaims } from "../services/claimService";
import { getToken } from "../services/authService";
import type { Policy } from "../types/Policy";
import type { Claim } from "../types/Claim";

type DashboardProps = {
  onNavigate: (page: "policies" | "claims", status?: string) => void;
};

type Range = "3" | "6" | "12" | "all";

interface DashboardSummary {
  totalPolicies: number;
  activePolicies: number;
  totalClaims: number;
  pendingClaims: number;
  totalClaimAmount: number;
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

function Dashboard({ onNavigate }: DashboardProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [range, setRange] = useState<Range>("6");

  // LOAD DASHBOARD DATA
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        // Get JWT from the existing authentication service.
        const token = getToken();

        if (!token) {
          throw new Error("Session expired. Please log in again.");
        }

        // Load policies, claims, and backend summary.
        const [nextPolicies, nextClaims, summaryResponse] = await Promise.all([
          getAllPolicies(),
          getAllClaims(),
          fetch("/api/dashboard/summary", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }),
        ]);

        if (summaryResponse.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }

        if (summaryResponse.status === 403) {
          throw new Error("You do not have permission to view the dashboard.");
        }

        if (!summaryResponse.ok) {
          throw new Error(
            `Unable to load dashboard summary (${summaryResponse.status})`,
          );
        }

        const nextSummary: DashboardSummary = await summaryResponse.json();

        if (active) {
          setPolicies(nextPolicies);
          setClaims(nextClaims);
          setSummary(nextSummary);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load dashboard",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // POLICY STATUS COUNTS
  const policyCount = (status: string) =>
    policies.filter((p) => p.status?.toUpperCase() === status).length;

  // CLAIM STATUS COUNTS
  const claimCount = (status: string) =>
    claims.filter((c) => c.status?.toUpperCase() === status).length;

  const approved = claimCount("APPROVED");
  const rejected = claimCount("REJECTED");
  const resolved = approved + rejected;

  // APPROVAL RATE
  const approvalRate = resolved ? (approved / resolved) * 100 : 0;

  // TOTAL POLICY PREMIUMS
  const premiumTotal = policies.reduce(
    (sum, p) => sum + Number(p.premiumAmount || 0),
    0,
  );

  // TOTAL CLAIM AMOUNT FROM SPRING BOOT
  const claimedTotal = summary ? Number(summary.totalClaimAmount) : 0;

  const policyStatuses = ["ACTIVE", "EXPIRED", "CANCELLED"];

  const claimStatuses = ["PENDING", "APPROVED", "REJECTED"];

  // RECENT CLAIMS
  const recentClaims = [...claims]
    .sort((a, b) => {
      const delta =
        new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime();

      return (Number.isNaN(delta) ? 0 : delta) || b.id - a.id;
    })
    .slice(0, 5);

  // MONTHLY CLAIMS TREND
  const today = new Date();

  const datedClaims = claims.filter(
    (c) => !Number.isNaN(new Date(`${c.claimDate}T00:00:00`).getTime()),
  );

  const firstClaim = datedClaims.reduce<Date | null>((first, claim) => {
    const date = new Date(`${claim.claimDate}T00:00:00`);

    return !first || date < first ? date : first;
  }, null);

  const monthCount =
    range === "all"
      ? Math.min(
          60,
          firstClaim
            ? Math.max(
                1,
                (today.getFullYear() - firstClaim.getFullYear()) * 12 +
                  today.getMonth() -
                  firstClaim.getMonth() +
                  1,
              )
            : 6,
        )
      : Number(range);

  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - (monthCount - 1 - index),
      1,
    );

    const count = datedClaims.filter((claim) => {
      const claimDate = new Date(`${claim.claimDate}T00:00:00`);

      return (
        claimDate.getFullYear() === date.getFullYear() &&
        claimDate.getMonth() === date.getMonth()
      );
    }).length;

    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      count,
    };
  });

  const maxMonthly = Math.max(1, ...months.map((month) => month.count));

  // STATUS CHART COMPONENT
  function statusChart(
    statuses: string[],
    page: "policies" | "claims",
    total: number,
  ) {
    const getCount = page === "policies" ? policyCount : claimCount;

    return (
      <div className="analytics-breakdown">
        {statuses.map((status) => {
          const count = getCount(status);
          const percentage = total ? (count / total) * 100 : 0;

          return (
            <button
              className="analytics-breakdown-row"
              type="button"
              key={status}
              onClick={() => onNavigate(page, status)}
            >
              <div className="analytics-breakdown-label">
                <span>{status}</span>

                <strong>
                  {count} ({percentage.toFixed(1)}%)
                </strong>
              </div>

              <div className="analytics-track">
                <div
                  className={`analytics-fill ${status.toLowerCase()}`}
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="dashboard" role="status">
        Loading dashboard...
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="dashboard" role="alert">
        <p>{error}</p>

        <button type="button" onClick={() => setRefreshKey((n) => n + 1)}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard analytics-dashboard">
      {/* DASHBOARD HEADER */}
      <header className="dashboard-header">
        <div>
          <h1>Insurance Dashboard</h1>

          <p className="dashboard-subtitle">
            Policies, claims, and performance at a glance
          </p>
        </div>

        <div className="dashboard-header-info">
          <span className="dashboard-date">
            {today.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>

          <span className="system-status">
            <span className="status-dot" />
            Data loaded
          </span>

          <button
            type="button"
            className="analytics-refresh"
            onClick={() => setRefreshKey((n) => n + 1)}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* SUMMARY CARDS */}
      <div className="dashboard-cards">
        {[
          {
            title: "Total Policies",
            count: summary?.totalPolicies ?? 0,
            icon: "📄",
            iconClass: "policies-icon",
            page: "policies" as const,
            status: "ALL",
          },
          {
            title: "Active Policies",
            count: summary?.activePolicies ?? 0,
            icon: "🛡️",
            iconClass: "active-icon",
            page: "policies" as const,
            status: "ACTIVE",
          },
          {
            title: "Total Claims",
            count: summary?.totalClaims ?? 0,
            icon: "📋",
            iconClass: "claims-icon",
            page: "claims" as const,
            status: "ALL",
          },
          {
            title: "Pending Claims",
            count: summary?.pendingClaims ?? 0,
            icon: "⏳",
            iconClass: "pending-icon",
            page: "claims" as const,
            status: "PENDING",
          },
        ].map((item) => (
          <button
            type="button"
            key={item.title}
            className="dashboard-card clickable-card"
            onClick={() => onNavigate(item.page, item.status)}
          >
            <div className="card-top">
              <h3>{item.title}</h3>

              <span
                className={`card-icon ${item.iconClass}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            </div>

            <p>{item.count}</p>

            <span className="card-description">Click to view details</span>
          </button>
        ))}
      </div>

      {/* STATUS OVERVIEW */}
      <section className="dashboard-status-summary">
        <h2>Status Overview</h2>

        <div className="dashboard-status-grid">
          {[
            {
              label: "Expired Policies",
              count: policyCount("EXPIRED"),
              page: "policies" as const,
              status: "EXPIRED",
            },
            {
              label: "Cancelled Policies",
              count: policyCount("CANCELLED"),
              page: "policies" as const,
              status: "CANCELLED",
            },
            {
              label: "Approved Claims",
              count: approved,
              page: "claims" as const,
              status: "APPROVED",
            },
            {
              label: "Rejected Claims",
              count: rejected,
              page: "claims" as const,
              status: "REJECTED",
            },
            {
              label: "Pending Claims",
              count: summary?.pendingClaims ?? 0,
              page: "claims" as const,
              status: "PENDING",
            },
          ].map((item) => (
            <button
              type="button"
              key={item.label}
              className="dashboard-status-item"
              onClick={() => onNavigate(item.page, item.status)}
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </button>
          ))}
        </div>
      </section>

      {/* FINANCIAL ANALYTICS */}
      <div className="analytics-financials">
        <div className="analytics-panel">
          <span>Total Policy Premiums</span>

          <strong>{currency(premiumTotal)}</strong>

          <small>Sum of recorded premiums</small>
        </div>

        <div className="analytics-panel">
          <span>Total Claimed Amount</span>

          <strong>{currency(claimedTotal)}</strong>

          <small>All recorded claim amounts</small>
        </div>

        <div className="analytics-panel">
          <span>Claim Approval Rate</span>

          <strong>{approvalRate.toFixed(1)}%</strong>

          <small>Approved out of resolved claims</small>
        </div>
      </div>

      {/* STATUS CHARTS */}
      <div className="dashboard-charts">
        <section className="claims-chart">
          <h2>Policies by Status</h2>

          {statusChart(policyStatuses, "policies", policies.length)}
        </section>

        <section className="claims-chart">
          <h2>Claims by Status</h2>

          {statusChart(claimStatuses, "claims", claims.length)}
        </section>
      </div>

      {/* MONTHLY CLAIMS TREND */}
      <section className="monthly-chart-section monthly-claims-chart">
        <div className="monthly-chart-toolbar">
          <div>
            <h2>Monthly Claims Trend</h2>

            <p>Number of claims submitted each month</p>
          </div>

          <select
            className="date-range-select"
            aria-label="Monthly claims date range"
            value={range}
            onChange={(event) => setRange(event.target.value as Range)}
          >
            <option value="3">Last 3 months</option>

            <option value="6">Last 6 months</option>

            <option value="12">Last 12 months</option>

            <option value="all">All available (up to 60 months)</option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "end",
            gap: 10,
            minHeight: 220,
            overflowX: "auto",
            padding: "12px 4px",
          }}
        >
          {months.map((month) => (
            <div
              key={month.key}
              style={{
                flex: "1 0 38px",
                minWidth: 38,
                textAlign: "center",
              }}
              title={`${month.label}: ${month.count} claims`}
            >
              <span style={{ fontSize: 12 }}>{month.count}</span>

              <div
                style={{
                  height: 160,
                  display: "flex",
                  alignItems: "end",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "70%",
                    minHeight: month.count ? 4 : 0,
                    height: `${(month.count / maxMonthly) * 100}%`,
                    background: "#2563eb",
                    borderRadius: "6px 6px 0 0",
                  }}
                />
              </div>

              <span
                style={{
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                {month.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* RECENT CLAIMS */}
      <section className="recent-claims">
        <div className="analytics-section-header">
          <h2>Recent Claims</h2>

          <button type="button" onClick={() => onNavigate("claims")}>
            View All
          </button>
        </div>

        {recentClaims.length === 0 ? (
          <p>No claims yet.</p>
        ) : (
          <div className="recent-claims-table-wrapper">
            <table className="recent-claims-table">
              <thead>
                <tr>
                  <th>Claim Number</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td>{claim.claimNumber}</td>

                    <td>{claim.claimDate}</td>

                    <td>{currency(Number(claim.claimAmount))}</td>

                    <td>
                      <span
                        className={`claim-status ${claim.status.toLowerCase()}`}
                      >
                        {claim.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
