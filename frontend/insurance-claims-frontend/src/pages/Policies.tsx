import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getAllPolicies, deletePolicy } from "../services/policyService";
import type { Policy } from "../types/Policy";
import { isAdmin } from "../services/roleService";
import PolicyForm from "../components/PolicyForm";
import EditPolicyForm from "../components/EditPolicyForm";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import Toast from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

type PoliciesProps = {
  initialStatusFilter?: string;
};
type SortField = "id" | "policyNumber" | "premiumAmount" | "status";
type MenuState = {
  policy: Policy;
  top: number;
  left: number;
};
const ITEMS_PER_PAGE = 5;

function Policies({ initialStatusFilter = "ALL" }: PoliciesProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [openMenu, setOpenMenu] = useState<MenuState | null>(null);
  const canManagePolicies = isAdmin();

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
    setCurrentPage(1);
  }, [initialStatusFilter]);

  useEffect(() => {
    let active = true;

    async function fetchPolicies() {
      setLoading(true);
      setError("");

      try {
        const data = await getAllPolicies();

        if (active) {
          setPolicies(data);
        }
      } catch {
        if (active) {
          setError("Failed to load policies.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchPolicies();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!openMenu) return;

    function closeMenu() {
      setOpenMenu(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openMenu]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
  }

  function refreshPolicies() {
    setOpenMenu(null);
    setRefreshKey((key) => key + 1);
  }

  async function handleDelete() {
    if (!policyToDelete || deleting) return;

    setDeleting(true);

    try {
      await deletePolicy(policyToDelete.id);

      setPolicyToDelete(null);
      refreshPolicies();

      showToast("Policy deleted successfully!", "success");
    } catch {
      showToast(
        "Failed to delete policy. It may have associated claims.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  function toggleMenu(policy: Policy, button: HTMLButtonElement) {
    if (openMenu?.policy.id === policy.id) {
      setOpenMenu(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 100;

    const left = Math.max(
      8,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    );

    const spaceBelow = window.innerHeight - rect.bottom;

    const top =
      spaceBelow >= menuHeight + 8
        ? rect.bottom + 6
        : Math.max(8, rect.top - menuHeight - 6);

    setOpenMenu({ policy, top, left });
  }

  const search = searchTerm.trim().toLowerCase();

  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      String(policy.policyNumber ?? "")
        .toLowerCase()
        .includes(search) ||
      String(policy.policyHolderName ?? "")
        .toLowerCase()
        .includes(search) ||
      String(policy.policyType ?? "")
        .toLowerCase()
        .includes(search) ||
      String(policy.status ?? "")
        .toLowerCase()
        .includes(search);

    const matchesStatus =
      statusFilter === "ALL" ||
      String(policy.status ?? "").toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const sortedPolicies = [...filteredPolicies].sort((a, b) => {
    let comparison = 0;

    if (sortField === "id") {
      comparison = a.id - b.id;
    } else if (sortField === "premiumAmount") {
      comparison = a.premiumAmount - b.premiumAmount;
    } else {
      comparison = String(a[sortField]).localeCompare(String(b[sortField]));
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    setCurrentPage(1);
    setOpenMenu(null);
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  function handleExportCSV() {
    if (sortedPolicies.length === 0) {
      showToast("No policies available to export.", "error");
      return;
    }

    const headers = [
      "ID",
      "Policy Number",
      "Policy Holder",
      "Policy Type",
      "Premium Amount",
      "Start Date",
      "End Date",
      "Status",
    ];

    function escapeCSV(value: string | number) {
      const text = String(value ?? "");

      // Protect spreadsheet users from formula injection.
      const safeText = /^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text;

      return `"${safeText.replace(/"/g, '""')}"`;
    }

    const rows = sortedPolicies.map((policy) => [
      policy.id,
      policy.policyNumber,
      policy.policyHolderName,
      policy.policyType,
      policy.premiumAmount,
      policy.startDate,
      policy.endDate,
      policy.status,
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
    link.download = "policies.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showToast("Policies exported successfully!", "success");
  }

  const totalPages = Math.ceil(filteredPolicies.length / ITEMS_PER_PAGE);

  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;

  const paginatedPolicies = sortedPolicies.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  if (loading) {
    return <LoadingSpinner message="Loading policies..." />;
  }

  if (error) {
    return (
      <div>
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>

        <button type="button" className="btn-refresh" onClick={refreshPolicies}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Policy Management</h2>

      {/* Create Policy - ADMIN Only */}
      {canManagePolicies && (
        <div className="policy-create-section">
          <button
            type="button"
            className="btn-refresh"
            onClick={() => setShowCreateForm((previous) => !previous)}
          >
            {showCreateForm ? "Cancel" : "+ Add Policy"}
          </button>

          {showCreateForm && (
            <div style={{ marginTop: "20px" }}>
              <PolicyForm
                onPolicyCreated={() => {
                  setShowCreateForm(false);
                  refreshPolicies();
                  showToast("Policy created successfully!", "success");
                }}
              />
            </div>
          )}
        </div>
      )}

      {canManagePolicies && <hr />}

      {/* Edit Policy */}
      {canManagePolicies && editingPolicy && (
        <>
          <EditPolicyForm
            key={editingPolicy.id}
            policy={editingPolicy}
            onUpdated={() => {
              setEditingPolicy(null);
              refreshPolicies();

              showToast("Policy updated successfully!", "success");
            }}
            onCancel={() => setEditingPolicy(null)}
          />
          <hr />
        </>
      )}

      {/* Search and Filter */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search policies..."
          aria-label="Search policies"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setCurrentPage(1);
            setOpenMenu(null);
          }}
        />

        <select
          aria-label="Filter policies by status"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setCurrentPage(1);
            setOpenMenu(null);
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <button type="button" className="btn-refresh" onClick={refreshPolicies}>
          🔄 Refresh
        </button>

        <button type="button" className="btn-export" onClick={handleExportCSV}>
          📥 Export CSV
        </button>
      </div>

      {/* Policy Table */}
      {paginatedPolicies.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No Policies Found"
          message={
            searchTerm || statusFilter !== "ALL"
              ? "No policies match your search or selected filter."
              : "You haven't created any policies yet. Use the form above to add your first policy."
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
                    ID {sortIndicator("id")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => handleSort("policyNumber")}
                  >
                    Policy Number {sortIndicator("policyNumber")}
                  </button>
                </th>

                <th>Policy Holder</th>
                <th>Policy Type</th>

                <th>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => handleSort("premiumAmount")}
                  >
                    Premium {sortIndicator("premiumAmount")}
                  </button>
                </th>

                <th>Start Date</th>
                <th>End Date</th>

                <th>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => handleSort("status")}
                  >
                    Status {sortIndicator("status")}
                  </button>
                </th>

                {canManagePolicies && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {paginatedPolicies.map((policy) => (
                <tr key={policy.id}>
                  <td>{policy.id}</td>
                  <td>{policy.policyNumber}</td>
                  <td>{policy.policyHolderName}</td>
                  <td>{policy.policyType}</td>

                  <td>${Number(policy.premiumAmount).toFixed(2)}</td>

                  <td>{policy.startDate}</td>
                  <td>{policy.endDate}</td>

                  <td>
                    <span
                      className={`status-badge ${policy.status.toLowerCase()}`}
                    >
                      {policy.status}
                    </span>
                  </td>
                  {canManagePolicies && (
                    <td>
                      <button
                        type="button"
                        className="policy-more-button"
                        aria-label={`More actions for ${policy.policyNumber}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenu?.policy.id === policy.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleMenu(policy, event.currentTarget);
                        }}
                      >
                        ⋯
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="pagination">
        <button
          type="button"
          disabled={safeCurrentPage === 1}
          onClick={() => {
            setCurrentPage(safeCurrentPage - 1);
            setOpenMenu(null);
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
            setOpenMenu(null);
          }}
        >
          Next
        </button>
      </div>

      {/* More Actions Dropdown */}
      {canManagePolicies &&
        openMenu &&
        createPortal(
          <div
            className="policy-actions-menu"
            role="menu"
            style={{
              position: "fixed",
              top: openMenu.top,
              left: openMenu.left,
              zIndex: 9999,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setEditingPolicy(openMenu.policy);
                setOpenMenu(null);
              }}
            >
              ✏️ Edit Policy
            </button>

            <button
              type="button"
              role="menuitem"
              className="policy-menu-delete"
              onClick={() => {
                setPolicyToDelete(openMenu.policy);
                setOpenMenu(null);
              }}
            >
              🗑️ Delete Policy
            </button>
          </div>,
          document.body,
        )}

      {/* Delete Confirmation */}
      {canManagePolicies && policyToDelete && (
        <DeleteConfirmModal
          itemName={policyToDelete.policyNumber}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleting) {
              setPolicyToDelete(null);
            }
          }}
        />
      )}

      {/* Toast */}
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

export default Policies;
