import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getAllClaims,
  deleteClaim,
  updateClaim,
} from "../services/claimService";
import type { Claim } from "../types/Claim";
import type { Policy } from "../types/Policy";
import ClaimForm from "../components/ClaimForm";
import EditClaimForm from "../components/EditClaimForm";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import Toast from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { getAllPolicies } from "../services/policyService";
import { isAdmin } from "../services/roleService";
import { getToken } from "../services/authService";

type ClaimsProps = {
  initialStatusFilter?: string;
};

type ClaimHistoryEntry = {
  id: number;
  claimId: number;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
};

type SortField = "id" | "claimNumber" | "claimAmount" | "claimDate" | "status";

function Claims({ initialStatusFilter = "ALL" }: ClaimsProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const canManageClaims = isAdmin();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [claimToDelete, setClaimToDelete] = useState<Claim | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingClaimId, setUpdatingClaimId] = useState<number | null>(null);
  const updatingRef = useRef(false);

  // =====================================
  // CLAIM HISTORY STATE
  // =====================================

  const [historyClaim, setHistoryClaim] = useState<Claim | null>(null);
  const [historyEntries, setHistoryEntries] = useState<ClaimHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const historyRequestRef = useRef(0);

  // =====================================
  // DROPDOWN MENU STATE
  // =====================================

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const moreActionsRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // =====================================
  // SEARCH, FILTER, SORT AND PAGINATION
  // =====================================

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 5;

  function getPolicyDetails(policyId: number) {
    const policy = policies.find((item) => item.id === policyId);

    if (!policy) {
      return `Policy #${policyId} (Not Found)`;
    }

    return `${policy.policyNumber} — ${policy.policyHolderName}`;
  }

  // =====================================
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // =====================================

  useEffect(() => {
    if (openMenuId === null) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !moreActionsRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpenMenuId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    function handleViewportChange() {
      setOpenMenuId(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [openMenuId]);

  function toggleMoreActions(claimId: number, button: HTMLButtonElement) {
    if (openMenuId === claimId) {
      setOpenMenuId(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 155;

    const left = Math.max(
      8,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    );

    const spaceBelow = window.innerHeight - rect.bottom;

    const top =
      spaceBelow >= menuHeight + 8
        ? rect.bottom + 6
        : Math.max(8, rect.top - menuHeight - 6);

    setMenuPosition({ top, left });
    setOpenMenuId(claimId);
  }

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
    setCurrentPage(1);
    setOpenMenuId(null);
  }, [initialStatusFilter]);

  // =====================================
  // FETCH CLAIMS AND POLICIES
  // =====================================

  useEffect(() => {
    let active = true;

    async function fetchClaims() {
      setLoading(true);
      setError("");

      try {
        const [claimsData, policiesData] = await Promise.all([
          getAllClaims(),
          getAllPolicies(),
        ]);

        if (active) {
          setClaims(claimsData);
          setPolicies(policiesData);
        }
      } catch {
        if (active) {
          setError("Failed to load claims");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchClaims();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // =====================================
  // DELETE CLAIM
  // =====================================

  async function handleDelete() {
    if (!claimToDelete || deleting) return;

    setDeleting(true);

    try {
      await deleteClaim(claimToDelete.id);

      setClaimToDelete(null);
      setRefreshKey((key) => key + 1);

      setToast({
        message: "Claim deleted successfully!",
        type: "success",
      });
    } catch {
      setToast({
        message: "Failed to delete claim.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  // =====================================
  // APPROVE OR REJECT CLAIM
  // =====================================

  async function handleStatusChange(
    claim: Claim,
    newStatus: "APPROVED" | "REJECTED",
  ) {
    if (updatingRef.current || claim.status.toUpperCase() !== "PENDING") {
      return;
    }

    updatingRef.current = true;

    const confirmed = window.confirm(
      `Are you sure you want to ${newStatus.toLowerCase()} claim ${claim.claimNumber}?`,
    );

    if (!confirmed) {
      updatingRef.current = false;
      return;
    }

    setOpenMenuId(null);
    setUpdatingClaimId(claim.id);

    try {
      await updateClaim(claim.id, {
        claimNumber: claim.claimNumber,
        claimAmount: claim.claimAmount,
        claimDate: claim.claimDate,
        description: claim.description,
        status: newStatus,
        policyId: claim.policyId,
      });

      setClaims((previous) =>
        previous.map((item) =>
          item.id === claim.id ? { ...item, status: newStatus } : item,
        ),
      );

      setRefreshKey((key) => key + 1);

      setToast({
        message: `Claim ${newStatus.toLowerCase()} successfully!`,
        type: "success",
      });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? err.message : "Failed to update claim status.",
        type: "error",
      });
    } finally {
      updatingRef.current = false;
      setUpdatingClaimId(null);
    }
  }

  // =====================================
  // CLAIM HISTORY API
  // =====================================

  async function openClaimHistory(claim: Claim) {
    setOpenMenuId(null);
    setHistoryClaim(claim);
    setHistoryEntries([]);
    setHistoryError("");
    setHistoryLoading(true);

    const requestId = ++historyRequestRef.current;

    try {
      const token = getToken();

      const response = await fetch(`/api/claims/${claim.id}/history`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(
          `Could not load claim history (HTTP ${response.status}).`,
        );
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Unexpected history response from the server.");
      }

      if (historyRequestRef.current === requestId) {
        setHistoryEntries(data as ClaimHistoryEntry[]);
      }
    } catch (err) {
      if (historyRequestRef.current === requestId) {
        setHistoryError(
          err instanceof Error ? err.message : "Failed to load history.",
        );
      }
    } finally {
      if (historyRequestRef.current === requestId) {
        setHistoryLoading(false);
      }
    }
  }

  function closeClaimHistory() {
    ++historyRequestRef.current;

    setHistoryClaim(null);
    setHistoryEntries([]);
    setHistoryError("");
    setHistoryLoading(false);
  }

  // Close popup with Escape

  useEffect(() => {
    if (!historyClaim) return;

    function handleHistoryEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeClaimHistory();
      }
    }

    document.addEventListener("keydown", handleHistoryEscape);

    return () => document.removeEventListener("keydown", handleHistoryEscape);
  }, [historyClaim]);

  function formatHistoryDate(value: string) {
    if (!value) return "—";

    return value.replace("T", " ").replace(/\.\d+$/, "");
  }

  // =====================================
  // SEARCH AND FILTER
  // =====================================

  const filteredClaims = claims.filter((claim) => {
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      String(claim.claimNumber ?? "")
        .toLowerCase()
        .includes(search) ||
      String(claim.description ?? "")
        .toLowerCase()
        .includes(search) ||
      String(claim.status ?? "")
        .toLowerCase()
        .includes(search) ||
      String(claim.policyId ?? "").includes(search);

    const matchesStatus =
      statusFilter === "ALL" ||
      String(claim.status ?? "").toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // =====================================
  // SORTING
  // =====================================

  const sortedClaims = [...filteredClaims].sort((a, b) => {
    let comparison = 0;

    if (sortField === "id") {
      comparison = a.id - b.id;
    } else if (sortField === "claimAmount") {
      comparison = a.claimAmount - b.claimAmount;
    } else {
      comparison = String(a[sortField]).localeCompare(String(b[sortField]));
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    setCurrentPage(1);
    setOpenMenuId(null);
  }

  // =====================================
  // CSV EXPORT
  // =====================================

  function handleExportCSV() {
    if (sortedClaims.length === 0) {
      setToast({
        message: "No claims available to export.",
        type: "error",
      });
      return;
    }

    const headers = [
      "ID",
      "Claim Number",
      "Claim Amount",
      "Claim Date",
      "Description",
      "Status",
      "Policy ID",
    ];

    function escapeCSV(value: string | number) {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    }

    const rows = sortedClaims.map((claim) => [
      claim.id,
      claim.claimNumber,
      claim.claimAmount,
      claim.claimDate,
      claim.description,
      claim.status,
      claim.policyId,
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "claims.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setToast({
      message: "Claims exported successfully!",
      type: "success",
    });
  }

  function sortIcon(field: SortField) {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  // =====================================
  // PAGINATION
  // =====================================

  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);

  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;

  const paginatedClaims = sortedClaims.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // =====================================
  // LOADING AND ERROR
  // =====================================

  if (loading) {
    return <LoadingSpinner message="Loading claims..." />;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: "red" }}>{error}</p>

        <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>
          Try Again
        </button>
      </div>
    );
  }

  // =====================================
  // MAIN UI
  // =====================================

  return (
    <div className="claims-page">
      <h2>Claims Management</h2>

      {/* CREATE CLAIM - ADMIN ONLY */}
      {canManageClaims && (
        <>
          <button
            type="button"
            className="btn-refresh"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? "Cancel" : "+ Add Claim"}
          </button>

          {showCreateForm && (
            <div style={{ marginTop: "20px" }}>
              <ClaimForm
                onClaimCreated={() => {
                  setShowCreateForm(false);
                  setRefreshKey((key) => key + 1);
                  setToast({
                    message: "Claim created successfully!",
                    type: "success",
                  });
                }}
              />
            </div>
          )}
          <hr />
        </>
      )}

      {/* EDIT CLAIM */}

      {canManageClaims && editingClaim && (
        <EditClaimForm
          key={editingClaim.id}
          claim={editingClaim}
          onUpdated={() => {
            setEditingClaim(null);
            setRefreshKey((key) => key + 1);

            setToast({
              message: "Claim updated successfully!",
              type: "success",
            });
          }}
          onCancel={() => setEditingClaim(null)}
        />
      )}

      <hr />

      {/* SEARCH AND FILTER */}

      <div className="search-container">
        <input
          type="text"
          placeholder="Search claims..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
            setOpenMenuId(null);
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
            setOpenMenuId(null);
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <button
          type="button"
          className="btn-refresh"
          onClick={() => {
            setOpenMenuId(null);
            setRefreshKey((key) => key + 1);
          }}
        >
          🔄 Refresh
        </button>

        <button type="button" className="btn-export" onClick={handleExportCSV}>
          📥 Export CSV
        </button>
      </div>

      {/* =====================================
          CLAIMS TABLE
      ===================================== */}

      {paginatedClaims.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No Claims Found"
          message={
            searchTerm || statusFilter !== "ALL"
              ? "No claims match your search or selected filter."
              : "You haven't submitted any claims yet. Use the form above to create your first claim."
          }
        />
      ) : (
        <div className="table-container">
          <table className="management-table">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => handleSort("id")}
                  >
                    ID {sortIcon("id")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => handleSort("claimNumber")}
                  >
                    Claim Number {sortIcon("claimNumber")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => handleSort("claimAmount")}
                  >
                    Claim Amount {sortIcon("claimAmount")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => handleSort("claimDate")}
                  >
                    Claim Date {sortIcon("claimDate")}
                  </button>
                </th>

                <th>Description</th>

                <th>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => handleSort("status")}
                  >
                    Status {sortIcon("status")}
                  </button>
                </th>

                <th>Policy Details</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedClaims.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.id}</td>

                  <td>{claim.claimNumber}</td>

                  <td>${claim.claimAmount.toFixed(2)}</td>

                  <td>{claim.claimDate}</td>

                  <td>{claim.description}</td>

                  <td>
                    <span
                      className={`status-badge ${claim.status.toLowerCase()}`}
                    >
                      {claim.status}
                    </span>
                  </td>

                  <td>{getPolicyDetails(claim.policyId)}</td>

                  <td>
                    <div className="action-buttons">
                      {/* APPROVE / REJECT */}

                      {canManageClaims &&
                        claim.status.toUpperCase() === "PENDING" && (
                          <>
                            <button
                              type="button"
                              className="btn-approve"
                              disabled={updatingClaimId !== null}
                              onClick={() =>
                                handleStatusChange(claim, "APPROVED")
                              }
                            >
                              {updatingClaimId === claim.id
                                ? "Processing..."
                                : "✓ Approve"}
                            </button>

                            <button
                              type="button"
                              className="btn-reject"
                              disabled={updatingClaimId !== null}
                              onClick={() =>
                                handleStatusChange(claim, "REJECTED")
                              }
                            >
                              {updatingClaimId === claim.id
                                ? "Processing..."
                                : "✕ Reject"}
                            </button>
                          </>
                        )}

                      {/* MORE ACTIONS */}

                      <div
                        className="more-actions-container"
                        ref={openMenuId === claim.id ? moreActionsRef : null}
                      >
                        <button
                          type="button"
                          className="btn-more-actions"
                          aria-label={`More actions for ${claim.claimNumber}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === claim.id}
                          onClick={(event) =>
                            toggleMoreActions(claim.id, event.currentTarget)
                          }
                        >
                          ⋯
                        </button>
                      </div>

                      {/* DROPDOWN MENU */}

                      {openMenuId === claim.id &&
                        createPortal(
                          <div
                            ref={menuRef}
                            className="claim-portal-menu"
                            role="menu"
                            style={{
                              top: menuPosition.top,
                              left: menuPosition.left,
                            }}
                          >
                            {canManageClaims && (
                              <button
                                type="button"
                                role="menuitem"
                                className="menu-edit"
                                disabled={updatingClaimId !== null}
                                onClick={() => {
                                  setEditingClaim(claim);
                                  setOpenMenuId(null);
                                }}
                              >
                                ✏️ Edit
                              </button>
                            )}

                            <button
                              type="button"
                              role="menuitem"
                              className="menu-history"
                              onClick={() => openClaimHistory(claim)}
                            >
                              🕒 View History
                            </button>

                            {canManageClaims && (
                              <button
                                type="button"
                                role="menuitem"
                                className="menu-delete"
                                disabled={updatingClaimId !== null}
                                onClick={() => {
                                  setClaimToDelete(claim);
                                  setOpenMenuId(null);
                                }}
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>,
                          document.body,
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================
          PAGINATION
      ===================================== */}

      <div className="pagination">
        <button
          type="button"
          disabled={safeCurrentPage === 1}
          onClick={() => {
            setCurrentPage(safeCurrentPage - 1);
            setOpenMenuId(null);
          }}
        >
          Previous
        </button>

        <span>
          Page {safeCurrentPage} of {Math.max(totalPages, 1)}
        </span>

        <button
          type="button"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => {
            setCurrentPage(safeCurrentPage + 1);
            setOpenMenuId(null);
          }}
        >
          Next
        </button>
      </div>

      {/* =====================================
          CLAIM HISTORY POPUP - TIMELINE
      ===================================== */}

      {historyClaim &&
        createPortal(
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeClaimHistory();
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0, 0, 0, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="claim-history-title"
              style={{
                background: "white",
                color: "#17212f",
                borderRadius: 12,
                padding: 24,
                width: "min(100%, 650px)",
                maxHeight: "85vh",
                overflowY: "auto",
                boxShadow: "0 12px 45px rgba(0,0,0,0.25)",
              }}
            >
              {/* HEADER */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <h3 id="claim-history-title" style={{ margin: 0 }}>
                  Claim History — {historyClaim.claimNumber}
                </h3>

                <button
                  type="button"
                  onClick={closeClaimHistory}
                  aria-label="Close history dialog"
                >
                  ✕
                </button>
              </div>

              {/* CURRENT STATUS */}

              <div className="claim-history-current">
                <span>Current Status:</span>

                <span
                  className={`claim-history-status ${historyClaim.status.toLowerCase()}`}
                >
                  {historyClaim.status}
                </span>
              </div>

              <hr />

              {/* HISTORY CONTENT */}

              {historyLoading ? (
                <p role="status">Loading history...</p>
              ) : historyError ? (
                <p
                  role="alert"
                  style={{
                    color: "#b91c1c",
                  }}
                >
                  {historyError}
                </p>
              ) : historyEntries.length === 0 ? (
                <div className="claim-history-empty">
                  <p>🕒 No status changes recorded yet.</p>

                  <span>
                    Approval or rejection history will appear here once the
                    claim status changes.
                  </span>
                </div>
              ) : (
                <div className="claim-history-timeline">
                  {historyEntries.map((entry) => {
                    const status = entry.newStatus.toUpperCase();

                    const title =
                      status === "APPROVED"
                        ? "Claim Approved"
                        : status === "REJECTED"
                          ? "Claim Rejected"
                          : `Status Changed to ${status}`;

                    return (
                      <div
                        key={entry.id}
                        className="claim-history-timeline-item"
                      >
                        <div
                          className={`claim-history-timeline-dot ${status.toLowerCase()}`}
                        />

                        <div className="claim-history-timeline-content">
                          <div className="claim-history-timeline-header">
                            <strong>{title}</strong>

                            <span
                              className={`claim-history-status ${status.toLowerCase()}`}
                            >
                              {status}
                            </span>
                          </div>

                          <p>
                            Changed from <strong>{entry.previousStatus}</strong>{" "}
                            to <strong>{entry.newStatus}</strong>
                          </p>

                          <div className="claim-history-timeline-date">
                            🕒 {formatHistoryDate(entry.changedAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* FOOTER */}

              <div className="claim-history-footer">
                <button
                  type="button"
                  className="claim-history-close-btn"
                  onClick={closeClaimHistory}
                >
                  Close
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}

      {/* =====================================
          DELETE CONFIRMATION
      ===================================== */}

      {claimToDelete && (
        <DeleteConfirmModal
          itemName={claimToDelete.claimNumber}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleting) {
              setClaimToDelete(null);
            }
          }}
        />
      )}

      {/* =====================================
          TOAST NOTIFICATION
      ===================================== */}

      {toast && (
        <Toast
          key={`${toast.type}-${toast.message}-${refreshKey}`}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default Claims;
