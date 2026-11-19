import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import Claims from "./Claims";

import {
  getAllClaims,
  deleteClaim,
  updateClaim,
} from "../services/claimService";

import { getAllPolicies } from "../services/policyService";
import { isAdmin } from "../services/roleService";
import { getToken } from "../services/authService";

import type { Claim } from "../types/Claim";
import type { Policy } from "../types/Policy";

// =====================================
// MOCK SERVICES
// =====================================

vi.mock("../services/claimService", () => ({
  getAllClaims: vi.fn(),
  deleteClaim: vi.fn(),
  updateClaim: vi.fn(),
}));

vi.mock("../services/policyService", () => ({
  getAllPolicies: vi.fn(),
}));

vi.mock("../services/roleService", () => ({
  isAdmin: vi.fn(),
}));

vi.mock("../services/authService", () => ({
  getToken: vi.fn(),
}));

// =====================================
// MOCK CHILD COMPONENTS
// =====================================

vi.mock("../components/ClaimForm", () => ({
  default: ({ onClaimCreated }: { onClaimCreated: () => void }) => (
    <div data-testid="claim-form">
      <h3>Create Claim Form</h3>

      <button onClick={onClaimCreated}>Complete Creation</button>
    </div>
  ),
}));

vi.mock("../components/EditClaimForm", () => ({
  default: ({
    claim,
    onUpdated,
    onCancel,
  }: {
    claim: Claim;
    onUpdated: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="edit-claim-form">
      <h3>Edit Claim: {claim.claimNumber}</h3>

      <button onClick={onUpdated}>Complete Update</button>

      <button onClick={onCancel}>Cancel Editing</button>
    </div>
  ),
}));

vi.mock("../components/DeleteConfirmModal", () => ({
  default: ({
    itemName,
    onConfirm,
    onCancel,
  }: {
    itemName: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div role="dialog" aria-label="Confirm Deletion">
      <p>Delete {itemName}?</p>

      <button onClick={onConfirm}>Confirm Delete</button>

      <button onClick={onCancel}>Cancel Deletion</button>
    </div>
  ),
}));

vi.mock("../components/Toast", () => ({
  default: ({
    message,
    type,
    onClose,
  }: {
    message: string;
    type: "success" | "error";
    onClose: () => void;
  }) => (
    <div
      data-testid="toast"
      data-type={type}
      role={type === "error" ? "alert" : "status"}
    >
      <span>{message}</span>

      <button onClick={onClose}>Close notification</button>
    </div>
  ),
}));

vi.mock("../components/LoadingSpinner", () => ({
  default: ({ message }: { message: string }) => (
    <div role="status">{message}</div>
  ),
}));

vi.mock("../components/EmptyState", () => ({
  default: ({ title, message }: { title: string; message: string }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  ),
}));

// =====================================
// MOCK FUNCTIONS
// =====================================

const mockGetAllClaims = vi.mocked(getAllClaims);
const mockGetAllPolicies = vi.mocked(getAllPolicies);
const mockDeleteClaim = vi.mocked(deleteClaim);
const mockUpdateClaim = vi.mocked(updateClaim);
const mockIsAdmin = vi.mocked(isAdmin);
const mockGetToken = vi.mocked(getToken);

const mockFetch = vi.fn();

// =====================================
// TEST DATA
// =====================================

const mockPolicies: Policy[] = [
  {
    id: 101,
    policyNumber: "POL-101",
    policyHolderName: "John Smith",
    policyType: "HEALTH",
    premiumAmount: 1500,
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    status: "ACTIVE",
  },
  {
    id: 102,
    policyNumber: "POL-102",
    policyHolderName: "Jane Doe",
    policyType: "AUTO",
    premiumAmount: 2500,
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    status: "ACTIVE",
  },
];

function createMockClaim(id: number, overrides: Partial<Claim> = {}): Claim {
  return {
    id,
    claimNumber: `CLM-${String(id).padStart(3, "0")}`,
    claimAmount: 1000,
    claimDate: "2026-11-01",
    description: "Insurance claim",
    status: "PENDING",
    policyId: 101,
    ...overrides,
  };
}

const mockClaims: Claim[] = [
  createMockClaim(1, {
    claimAmount: 1800,
    description: "Medical expenses",
    claimDate: "2026-11-10",
    status: "PENDING",
  }),

  createMockClaim(2, {
    claimAmount: 2500,
    description: "Vehicle accident",
    claimDate: "2026-10-15",
    status: "APPROVED",
    policyId: 102,
  }),

  createMockClaim(3, {
    claimAmount: 500,
    description: "Dental treatment",
    claimDate: "2026-09-20",
    status: "REJECTED",
  }),

  createMockClaim(4, {
    claimAmount: 3500,
    description: "Hospital expenses",
    claimDate: "2026-08-12",
    status: "PENDING",
  }),

  createMockClaim(5, {
    claimAmount: 2000,
    description: "Vehicle repairs",
    claimDate: "2026-07-05",
    status: "APPROVED",
    policyId: 102,
  }),

  createMockClaim(6, {
    claimAmount: 3000,
    description: "Surgery expenses",
    claimDate: "2026-06-10",
    status: "PENDING",
  }),

  createMockClaim(7, {
    claimAmount: 750,
    description: "Property damage",
    claimDate: "2026-05-18",
    status: "REJECTED",
    policyId: 999,
  }),
];

const mockHistory = [
  {
    id: 1,
    claimId: 2,
    previousStatus: "PENDING",
    newStatus: "APPROVED",
    changedAt: "2026-11-10T10:30:00.123456",
  },
  {
    id: 2,
    claimId: 2,
    previousStatus: "APPROVED",
    newStatus: "REJECTED",
    changedAt: "2026-11-11T12:45:00",
  },
];

function historyResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  };
}

// =====================================
// HELPER FUNCTIONS
// =====================================

async function renderLoadedPage(initialStatusFilter = "ALL") {
  const result = render(<Claims initialStatusFilter={initialStatusFilter} />);

  await screen.findByRole("heading", {
    name: "Claims Management",
  });

  return result;
}

function clickButton(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function searchClaims(value: string) {
  fireEvent.change(screen.getByPlaceholderText("Search claims..."), {
    target: { value },
  });
}

function filterClaims(value: string) {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });
}

function getClaimRows() {
  const table = screen.queryByRole("table");

  if (!table) return [];

  return within(table).getAllByRole("row").slice(1);
}

function getVisibleClaimIds() {
  return getClaimRows().map((row) =>
    Number(within(row).getAllByRole("cell")[0].textContent),
  );
}

function getClaimRow(claimNumber: string) {
  return screen
    .getByText(claimNumber, {
      exact: true,
      selector: "td",
    })
    .closest("tr")!;
}

function openActions(claimNumber = "CLM-001") {
  clickButton(`More actions for ${claimNumber}`);
}

function openEdit(claimNumber = "CLM-001") {
  openActions(claimNumber);

  fireEvent.click(
    screen.getByRole("menuitem", {
      name: /Edit/,
    }),
  );
}

function openDelete(claimNumber = "CLM-001") {
  openActions(claimNumber);

  fireEvent.click(
    screen.getByRole("menuitem", {
      name: /Delete/,
    }),
  );
}

function openHistory(claimNumber = "CLM-002") {
  openActions(claimNumber);

  fireEvent.click(
    screen.getByRole("menuitem", {
      name: /View History/,
    }),
  );
}

function approveClaim(claimNumber = "CLM-001") {
  fireEvent.click(
    within(getClaimRow(claimNumber)).getByRole("button", { name: /Approve/ }),
  );
}

function rejectClaim(claimNumber = "CLM-001") {
  fireEvent.click(
    within(getClaimRow(claimNumber)).getByRole("button", { name: /Reject/ }),
  );
}

function expectToast(message: string, type: "success" | "error") {
  const toast = screen.getByTestId("toast");

  expect(toast).toHaveTextContent(message);
  expect(toast).toHaveAttribute("data-type", type);
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));

    reader.onerror = () => reject(reader.error);

    reader.readAsText(blob);
  });
}

// =====================================
// CLAIMS PAGE TESTS
// =====================================

describe("Claims Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockIsAdmin.mockReturnValue(true);

    mockGetAllClaims.mockResolvedValue(mockClaims);
    mockGetAllPolicies.mockResolvedValue(mockPolicies);

    mockDeleteClaim.mockResolvedValue(undefined);
    mockUpdateClaim.mockResolvedValue(mockClaims[0]);

    mockGetToken.mockReturnValue("test-jwt-token");

    mockFetch.mockResolvedValue(historyResponse(mockHistory));

    vi.stubGlobal("fetch", mockFetch);

    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1
  it("renders the claims management heading", async () => {
    await renderLoadedPage();

    expect(
      screen.getByRole("heading", {
        name: "Claims Management",
      }),
    ).toBeInTheDocument();
  });

  // 2
  it("renders the search and filter controls", async () => {
    await renderLoadedPage();

    expect(screen.getByPlaceholderText("Search claims...")).toBeInTheDocument();

    expect(screen.getByRole("combobox")).toHaveValue("ALL");
  });

  // 3
  it("renders refresh and export buttons", async () => {
    await renderLoadedPage();

    expect(screen.getByRole("button", { name: /Refresh/ })).toBeEnabled();

    expect(screen.getByRole("button", { name: /Export CSV/ })).toBeEnabled();
  });

  // 4
  it("renders all claim table headers", async () => {
    await renderLoadedPage();

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual([
      "ID ↑",
      "Claim Number ↕",
      "Claim Amount ↕",
      "Claim Date ↕",
      "Description",
      "Status ↕",
      "Policy Details",
      "Actions",
    ]);
  });

  // 5
  it("renders claim information correctly", async () => {
    await renderLoadedPage();

    const row = getClaimRow("CLM-001");

    expect(row).toHaveTextContent("CLM-001");
    expect(row).toHaveTextContent("Medical expenses");
    expect(row).toHaveTextContent("2026-11-10");
    expect(row).toHaveTextContent("PENDING");
  });

  // 6
  it("formats claim amounts to two decimal places", async () => {
    await renderLoadedPage();

    expect(
      within(getClaimRow("CLM-001")).getByText("$1800.00"),
    ).toBeInTheDocument();
  });

  // 7
  it("renders associated policy details", async () => {
    await renderLoadedPage();

    expect(
      within(getClaimRow("CLM-001")).getByText("POL-101 — John Smith"),
    ).toBeInTheDocument();
  });

  // 8
  it("renders a fallback when the associated policy is missing", async () => {
    await renderLoadedPage();

    clickButton("Next");

    expect(screen.getByText("Policy #999 (Not Found)")).toBeInTheDocument();
  });

  // 9
  it("renders the correct status badge classes", async () => {
    await renderLoadedPage();

    expect(within(getClaimRow("CLM-001")).getByText("PENDING")).toHaveClass(
      "status-badge",
      "pending",
    );

    expect(within(getClaimRow("CLM-002")).getByText("APPROVED")).toHaveClass(
      "status-badge",
      "approved",
    );

    expect(within(getClaimRow("CLM-003")).getByText("REJECTED")).toHaveClass(
      "status-badge",
      "rejected",
    );
  });

  // 10
  it("renders all available status options", async () => {
    await renderLoadedPage();

    const options = within(screen.getByRole("combobox")).getAllByRole("option");

    expect(
      options.map((option) => (option as HTMLOptionElement).value),
    ).toEqual(["ALL", "PENDING", "APPROVED", "REJECTED"]);
  });

  // =====================================
  // LOADING AND ERROR HANDLING
  // =====================================

  // 11
  it("fetches claims and policies on mount", async () => {
    await renderLoadedPage();

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);
    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);
  });

  // 12
  it("displays loading while claims are being retrieved", async () => {
    let resolveClaims!: (claims: Claim[]) => void;

    mockGetAllClaims.mockReturnValueOnce(
      new Promise<Claim[]>((resolve) => {
        resolveClaims = resolve;
      }),
    );

    render(<Claims />);

    expect(screen.getByText("Loading claims...")).toBeInTheDocument();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await act(async () => {
      resolveClaims(mockClaims);
    });

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  // 13
  it("waits for associated policies before displaying claims", async () => {
    let resolvePolicies!: (policies: Policy[]) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((resolve) => {
        resolvePolicies = resolve;
      }),
    );

    render(<Claims />);

    expect(screen.getByText("Loading claims...")).toBeInTheDocument();

    await act(async () => {
      resolvePolicies(mockPolicies);
    });

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  // 14
  it("displays an error when fetching claims fails", async () => {
    mockGetAllClaims.mockRejectedValueOnce(new Error("Network error"));

    render(<Claims />);

    expect(
      await screen.findByText("Failed to load claims"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
  });

  // 15
  it("displays an error when fetching policies fails", async () => {
    mockGetAllPolicies.mockRejectedValueOnce(
      new Error("Policy service unavailable"),
    );

    render(<Claims />);

    expect(
      await screen.findByText("Failed to load claims"),
    ).toBeInTheDocument();
  });

  // 16
  it("retries both API requests after an error", async () => {
    mockGetAllClaims.mockRejectedValueOnce(new Error("Network error"));

    render(<Claims />);

    await screen.findByText("Failed to load claims");

    clickButton("Try Again");

    await screen.findByRole("table");

    expect(mockGetAllClaims).toHaveBeenCalledTimes(2);
    expect(mockGetAllPolicies).toHaveBeenCalledTimes(2);
  });

  // 17
  it("refreshes the claims table", async () => {
    await renderLoadedPage();

    mockGetAllClaims.mockResolvedValueOnce([mockClaims[0]]);

    clickButton(/Refresh/);

    await waitFor(() => {
      expect(getVisibleClaimIds()).toEqual([1]);
    });

    expect(mockGetAllClaims).toHaveBeenCalledTimes(2);
    expect(mockGetAllPolicies).toHaveBeenCalledTimes(2);
  });

  // 18
  it("ignores successful API responses after unmounting", async () => {
    let resolveClaims!: (claims: Claim[]) => void;

    mockGetAllClaims.mockReturnValueOnce(
      new Promise<Claim[]>((resolve) => {
        resolveClaims = resolve;
      }),
    );

    const { unmount } = render(<Claims />);

    unmount();

    await act(async () => {
      resolveClaims(mockClaims);
    });

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // 19
  it("ignores failed API responses after unmounting", async () => {
    let rejectClaims!: (error: Error) => void;

    mockGetAllClaims.mockReturnValueOnce(
      new Promise<Claim[]>((_, reject) => {
        rejectClaims = reject;
      }),
    );

    const { unmount } = render(<Claims />);

    unmount();

    await act(async () => {
      rejectClaims(new Error("Request failed"));
    });

    expect(screen.queryByText("Failed to load claims")).not.toBeInTheDocument();
  });

  // =====================================
  // EMPTY STATES
  // =====================================

  // 20
  it("renders an empty state when there are no claims", async () => {
    mockGetAllClaims.mockResolvedValue([]);

    await renderLoadedPage();

    expect(screen.getByText("No Claims Found")).toBeInTheDocument();

    expect(
      screen.getByText(
        "You haven't submitted any claims yet. Use the form above to create your first claim.",
      ),
    ).toBeInTheDocument();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // 21
  it("renders an empty state when no search results match", async () => {
    await renderLoadedPage();

    searchClaims("nonexistent");

    expect(
      screen.getByText("No claims match your search or selected filter."),
    ).toBeInTheDocument();
  });

  // 22
  it("disables pagination for an empty dataset", async () => {
    mockGetAllClaims.mockResolvedValue([]);

    await renderLoadedPage();

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  // =====================================
  // ROLE-BASED ACCESS CONTROL
  // =====================================

  // 23
  it("allows administrators to create claims", async () => {
    await renderLoadedPage();

    expect(
      screen.getByRole("button", { name: "+ Add Claim" }),
    ).toBeInTheDocument();
  });

  // 24
  it("shows approve and reject buttons for pending claims", async () => {
    await renderLoadedPage();

    const row = within(getClaimRow("CLM-001"));

    expect(row.getByRole("button", { name: /Approve/ })).toBeEnabled();

    expect(row.getByRole("button", { name: /Reject/ })).toBeEnabled();
  });

  // 25–26
  it.each(["CLM-002", "CLM-003"])(
    "hides status change buttons for finalized claim %s",
    async (claimNumber) => {
      await renderLoadedPage();

      const row = within(getClaimRow(claimNumber));

      expect(
        row.queryByRole("button", { name: /Approve/ }),
      ).not.toBeInTheDocument();

      expect(
        row.queryByRole("button", { name: /Reject/ }),
      ).not.toBeInTheDocument();
    },
  );

  // 27
  it("hides mutation controls for regular users", async () => {
    mockIsAdmin.mockReturnValue(false);

    await renderLoadedPage();

    expect(
      screen.queryByRole("button", { name: "+ Add Claim" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /Approve/ }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /Reject/ }),
    ).not.toBeInTheDocument();
  });

  // 28
  it("allows regular users to view claim history only in the action menu", async () => {
    mockIsAdmin.mockReturnValue(false);

    await renderLoadedPage();

    openActions();

    expect(
      screen.getByRole("menuitem", { name: /View History/ }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("menuitem", { name: /Edit/ }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("menuitem", { name: /Delete/ }),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // SEARCH TESTS
  // =====================================

  // 29–32
  it.each([
    ["CLM-003", [3]],
    ["Vehicle accident", [2]],
    ["REJECTED", [3, 7]],
    ["999", [7]],
  ] as const)("searches claims using %s", async (term, expectedIds) => {
    await renderLoadedPage();

    searchClaims(term);

    expect(getVisibleClaimIds()).toEqual(expectedIds);
  });

  // 33
  it("normalizes uppercase and whitespace in search", async () => {
    await renderLoadedPage();

    searchClaims("  mEdIcAl ExPeNsEs  ");

    expect(getVisibleClaimIds()).toEqual([1]);
  });

  // 34
  it("supports partial search matches", async () => {
    await renderLoadedPage();

    searchClaims("vehicle");

    expect(getVisibleClaimIds()).toEqual([2, 5]);
  });

  // 35
  it("restores results when search is cleared", async () => {
    await renderLoadedPage();

    searchClaims("dental");

    expect(getVisibleClaimIds()).toEqual([3]);

    searchClaims("");

    expect(getVisibleClaimIds()).toEqual([1, 2, 3, 4, 5]);
  });

  // =====================================
  // FILTER TESTS
  // =====================================

  // 36–38
  it.each([
    ["PENDING", [1, 4, 6]],
    ["APPROVED", [2, 5]],
    ["REJECTED", [3, 7]],
  ] as const)("filters claims by %s", async (status, expectedIds) => {
    await renderLoadedPage();

    filterClaims(status);

    expect(getVisibleClaimIds()).toEqual(expectedIds);
  });

  // 39
  it("combines search and status filtering", async () => {
    await renderLoadedPage();

    searchClaims("expenses");

    filterClaims("PENDING");

    expect(getVisibleClaimIds()).toEqual([1, 4, 6]);
  });

  // 40
  it("applies the initial status filter", async () => {
    await renderLoadedPage("APPROVED");

    expect(screen.getByRole("combobox")).toHaveValue("APPROVED");

    expect(getVisibleClaimIds()).toEqual([2, 5]);
  });

  // 41
  it("updates the filter when the initialStatusFilter prop changes", async () => {
    const { rerender } = await renderLoadedPage();

    rerender(<Claims initialStatusFilter="REJECTED" />);

    expect(getVisibleClaimIds()).toEqual([3, 7]);
  });

  // =====================================
  // SORTING TESTS
  // =====================================

  // 42
  it("sorts by ID ascending by default", async () => {
    mockGetAllClaims.mockResolvedValue([...mockClaims].reverse());

    await renderLoadedPage();

    expect(getVisibleClaimIds()).toEqual([1, 2, 3, 4, 5]);
  });

  // 43
  it("toggles ID sorting in both directions", async () => {
    await renderLoadedPage();

    clickButton(/^ID /);

    expect(getVisibleClaimIds()).toEqual([7, 6, 5, 4, 3]);

    clickButton(/^ID /);

    expect(getVisibleClaimIds()).toEqual([1, 2, 3, 4, 5]);
  });

  // 44
  it("sorts claim numbers alphabetically", async () => {
    mockGetAllClaims.mockResolvedValue([
      createMockClaim(1, { claimNumber: "CLM-C" }),
      createMockClaim(2, { claimNumber: "CLM-A" }),
      createMockClaim(3, { claimNumber: "CLM-B" }),
    ]);

    await renderLoadedPage();

    clickButton(/^Claim Number /);

    expect(getVisibleClaimIds()).toEqual([2, 3, 1]);

    clickButton(/^Claim Number /);

    expect(getVisibleClaimIds()).toEqual([1, 3, 2]);
  });

  // 45
  it("sorts claim amounts numerically", async () => {
    await renderLoadedPage();

    clickButton(/^Claim Amount /);

    expect(getVisibleClaimIds()).toEqual([3, 7, 1, 5, 2]);

    clickButton(/^Claim Amount /);

    expect(getVisibleClaimIds()).toEqual([4, 6, 2, 5, 1]);
  });

  // 46
  it("sorts claims chronologically", async () => {
    await renderLoadedPage();

    clickButton(/^Claim Date /);

    expect(getVisibleClaimIds()).toEqual([7, 6, 5, 4, 3]);

    clickButton(/^Claim Date /);

    expect(getVisibleClaimIds()).toEqual([1, 2, 3, 4, 5]);
  });

  // 47
  it("sorts claims alphabetically by status", async () => {
    await renderLoadedPage();

    clickButton(/^Status /);

    expect(getVisibleClaimIds()).toEqual([2, 5, 1, 4, 6]);

    clickButton(/^Status /);

    expect(getVisibleClaimIds()).toEqual([3, 7, 1, 4, 6]);
  });

  // =====================================
  // PAGINATION
  // =====================================

  // 48
  it("displays five claims per page", async () => {
    await renderLoadedPage();

    expect(getClaimRows()).toHaveLength(5);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  // 49
  it("navigates to the next page", async () => {
    await renderLoadedPage();

    clickButton("Next");

    expect(getVisibleClaimIds()).toEqual([6, 7]);

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  // 50
  it("returns to the previous page", async () => {
    await renderLoadedPage();

    clickButton("Next");

    clickButton("Previous");

    expect(getVisibleClaimIds()).toEqual([1, 2, 3, 4, 5]);
  });

  // 51
  it("resets pagination after searching", async () => {
    await renderLoadedPage();

    clickButton("Next");

    searchClaims("Medical");

    expect(getVisibleClaimIds()).toEqual([1]);

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  // 52
  it("resets pagination after filtering", async () => {
    await renderLoadedPage();

    clickButton("Next");

    filterClaims("APPROVED");

    expect(getVisibleClaimIds()).toEqual([2, 5]);
  });

  // 53
  it("resets pagination after sorting", async () => {
    await renderLoadedPage();

    clickButton("Next");

    clickButton(/^Claim Amount /);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    expect(getVisibleClaimIds()).toEqual([3, 7, 1, 5, 2]);
  });

  // 54
  it("handles a refresh that reduces the total number of pages", async () => {
    await renderLoadedPage();

    clickButton("Next");

    mockGetAllClaims.mockResolvedValueOnce([mockClaims[0]]);

    clickButton(/Refresh/);

    await waitFor(() => {
      expect(getVisibleClaimIds()).toEqual([1]);

      expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    });
  });

  // =====================================
  // CREATE CLAIM
  // =====================================

  // 55
  it("toggles the create claim form", async () => {
    await renderLoadedPage();

    clickButton("+ Add Claim");

    expect(screen.getByTestId("claim-form")).toBeInTheDocument();

    clickButton("Cancel");

    expect(screen.queryByTestId("claim-form")).not.toBeInTheDocument();
  });

  // 56
  it("refreshes claims after successful creation", async () => {
    await renderLoadedPage();

    clickButton("+ Add Claim");

    clickButton("Complete Creation");

    await screen.findByText("Claim created successfully!");

    expect(mockGetAllClaims).toHaveBeenCalledTimes(2);

    expect(screen.queryByTestId("claim-form")).not.toBeInTheDocument();

    expectToast("Claim created successfully!", "success");
  });

  // =====================================
  // ACTION MENU
  // =====================================

  // 57
  it("renders the action menu in a portal", async () => {
    const { container } = await renderLoadedPage();

    openActions();

    const menu = screen.getByRole("menu");

    expect(menu.parentElement).toBe(document.body);
    expect(container).not.toContainElement(menu);

    expect(
      screen.getByRole("button", {
        name: "More actions for CLM-001",
      }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  // 58
  it("renders all administrator menu actions", async () => {
    await renderLoadedPage();

    openActions();

    expect(screen.getAllByRole("menuitem")).toHaveLength(3);

    expect(screen.getByRole("menuitem", { name: /Edit/ })).toBeInTheDocument();

    expect(
      screen.getByRole("menuitem", { name: /View History/ }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("menuitem", { name: /Delete/ }),
    ).toBeInTheDocument();
  });

  // 59
  it("closes the menu when the same action button is clicked", async () => {
    await renderLoadedPage();

    openActions();

    openActions();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 60
  it("switches the menu to a different claim", async () => {
    await renderLoadedPage();

    openActions("CLM-001");

    openActions("CLM-002");

    expect(
      screen.getByRole("button", {
        name: "More actions for CLM-001",
      }),
    ).toHaveAttribute("aria-expanded", "false");

    expect(
      screen.getByRole("button", {
        name: "More actions for CLM-002",
      }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  // 61
  it("closes the menu using Escape", async () => {
    await renderLoadedPage();

    openActions();

    fireEvent.keyDown(document, { key: "Enter" });

    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 62
  it("closes the menu on outside mouse interaction", async () => {
    await renderLoadedPage();

    openActions();

    fireEvent.mouseDown(screen.getByRole("menu"));

    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 63
  it("keeps the menu open during interaction with its trigger", async () => {
    await renderLoadedPage();

    openActions();

    fireEvent.mouseDown(
      screen.getByRole("button", {
        name: "More actions for CLM-001",
      }),
    );

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  // 64
  it("closes the menu on scroll and resize", async () => {
    await renderLoadedPage();

    openActions();

    fireEvent.scroll(window);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    openActions();

    fireEvent.resize(window);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 65
  it("closes the action menu when the search changes", async () => {
    await renderLoadedPage();

    openActions();

    searchClaims("Medical");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // =====================================
  // EDIT CLAIM
  // =====================================

  // 66
  it("opens the edit form for the selected claim", async () => {
    await renderLoadedPage();

    openEdit("CLM-002");

    expect(
      screen.getByRole("heading", {
        name: "Edit Claim: CLM-002",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 67
  it("cancels claim editing", async () => {
    await renderLoadedPage();

    openEdit();

    clickButton("Cancel Editing");

    expect(screen.queryByTestId("edit-claim-form")).not.toBeInTheDocument();

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);
  });

  // 68
  it("refreshes the table after successful claim editing", async () => {
    await renderLoadedPage();

    openEdit();

    clickButton("Complete Update");

    await screen.findByText("Claim updated successfully!");

    expect(screen.queryByTestId("edit-claim-form")).not.toBeInTheDocument();

    expect(mockGetAllClaims).toHaveBeenCalledTimes(2);

    expectToast("Claim updated successfully!", "success");
  });

  // =====================================
  // DELETE CLAIM
  // =====================================

  // 69
  it("opens a confirmation modal for claim deletion", async () => {
    await renderLoadedPage();

    openDelete("CLM-002");

    expect(screen.getByRole("dialog")).toHaveTextContent("Delete CLM-002?");

    expect(mockDeleteClaim).not.toHaveBeenCalled();
  });

  // 70
  it("cancels claim deletion", async () => {
    await renderLoadedPage();

    openDelete();

    clickButton("Cancel Deletion");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(mockDeleteClaim).not.toHaveBeenCalled();
  });

  // 71 — CORRECTED ASYNCHRONOUS TEST
  it("deletes the selected claim and refreshes the table", async () => {
    await renderLoadedPage();

    mockGetAllClaims.mockResolvedValueOnce(
      mockClaims.filter((claim) => claim.id !== 1),
    );

    openDelete();

    clickButton("Confirm Delete");

    await screen.findByText("Claim deleted successfully!");

    expect(mockDeleteClaim).toHaveBeenCalledWith(1);

    await waitFor(() => {
      expect(mockGetAllClaims).toHaveBeenCalledTimes(2);

      expect(screen.queryByText("CLM-001")).not.toBeInTheDocument();

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      expect(getVisibleClaimIds()).toEqual([2, 3, 4, 5, 6]);
    });

    expectToast("Claim deleted successfully!", "success");
  });

  // 72
  it("displays an error when deletion fails", async () => {
    mockDeleteClaim.mockRejectedValueOnce(new Error("Delete failed"));

    await renderLoadedPage();

    openDelete();

    clickButton("Confirm Delete");

    await screen.findByText("Failed to delete claim.");

    expectToast("Failed to delete claim.", "error");

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);
  });

  // 73
  it("prevents duplicate deletion requests while deleting", async () => {
    let resolveDelete!: () => void;

    mockDeleteClaim.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );

    await renderLoadedPage();

    openDelete();

    clickButton("Confirm Delete");
    clickButton("Confirm Delete");
    clickButton("Cancel Deletion");

    expect(mockDeleteClaim).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      resolveDelete();
    });

    await screen.findByText("Claim deleted successfully!");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // =====================================
  // APPROVAL AND REJECTION
  // =====================================

  // 74–75
  it.each(["APPROVED", "REJECTED"] as const)(
    "updates a pending claim to %s with the correct payload",
    async (status) => {
      await renderLoadedPage();

      const updatedClaim: Claim = {
        ...mockClaims[0],
        status,
      };

      mockUpdateClaim.mockResolvedValueOnce(updatedClaim);

      mockGetAllClaims.mockResolvedValueOnce([
        updatedClaim,
        ...mockClaims.slice(1),
      ]);

      if (status === "APPROVED") {
        approveClaim();
      } else {
        rejectClaim();
      }

      const message = `Claim ${status.toLowerCase()} successfully!`;

      await screen.findByText(message);

      expect(window.confirm).toHaveBeenCalledWith(
        `Are you sure you want to ${status.toLowerCase()} claim CLM-001?`,
      );

      expect(mockUpdateClaim).toHaveBeenCalledWith(1, {
        claimNumber: "CLM-001",
        claimAmount: 1800,
        claimDate: "2026-11-10",
        description: "Medical expenses",
        status,
        policyId: 101,
      });

      await waitFor(() => {
        expect(mockGetAllClaims).toHaveBeenCalledTimes(2);

        expect(
          within(getClaimRow("CLM-001")).getByText(status),
        ).toBeInTheDocument();
      });

      expectToast(message, "success");
    },
  );

  // 76–77
  it.each(["approve", "reject"] as const)(
    "does not update a claim when the user cancels %s confirmation",
    async (action) => {
      vi.mocked(window.confirm).mockReturnValue(false);

      await renderLoadedPage();

      if (action === "approve") {
        approveClaim();
      } else {
        rejectClaim();
      }

      expect(mockUpdateClaim).not.toHaveBeenCalled();

      expect(
        within(getClaimRow("CLM-001")).getByText("PENDING"),
      ).toBeInTheDocument();
    },
  );

  // 78
  it("allows a new update after a confirmation is cancelled", async () => {
    vi.mocked(window.confirm)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await renderLoadedPage();

    approveClaim();

    expect(mockUpdateClaim).not.toHaveBeenCalled();

    approveClaim();

    await screen.findByText("Claim approved successfully!");

    expect(mockUpdateClaim).toHaveBeenCalledTimes(1);
  });

  // 79
  it("displays the API error when approval fails", async () => {
    mockUpdateClaim.mockRejectedValueOnce(
      new Error("Claim has already been processed"),
    );

    await renderLoadedPage();

    approveClaim();

    await screen.findByText("Claim has already been processed");

    expectToast("Claim has already been processed", "error");

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);
  });

  // 80
  it("displays a fallback error for non-Error rejection values", async () => {
    mockUpdateClaim.mockRejectedValueOnce("Unknown error");

    await renderLoadedPage();

    rejectClaim();

    await screen.findByText("Failed to update claim status.");

    expectToast("Failed to update claim status.", "error");
  });

  // 81
  it("disables status buttons while a claim is being processed", async () => {
    let resolveUpdate!: (claim: Claim) => void;

    mockUpdateClaim.mockReturnValueOnce(
      new Promise<Claim>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    await renderLoadedPage();

    approveClaim();

    const processingButtons = within(getClaimRow("CLM-001")).getAllByRole(
      "button",
      {
        name: "Processing...",
      },
    );

    expect(processingButtons).toHaveLength(2);

    processingButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    expect(
      within(getClaimRow("CLM-004")).getByRole("button", { name: /Approve/ }),
    ).toBeDisabled();

    await act(async () => {
      resolveUpdate({
        ...mockClaims[0],
        status: "APPROVED",
      });
    });

    await screen.findByText("Claim approved successfully!");
  });

  // 82
  it("disables edit and delete menu actions during a status update", async () => {
    let resolveUpdate!: (claim: Claim) => void;

    mockUpdateClaim.mockReturnValueOnce(
      new Promise<Claim>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    await renderLoadedPage();

    approveClaim();

    openActions("CLM-002");

    expect(screen.getByRole("menuitem", { name: /Edit/ })).toBeDisabled();

    expect(screen.getByRole("menuitem", { name: /Delete/ })).toBeDisabled();

    expect(
      screen.getByRole("menuitem", { name: /View History/ }),
    ).toBeEnabled();

    await act(async () => {
      resolveUpdate({
        ...mockClaims[0],
        status: "APPROVED",
      });
    });

    await screen.findByText("Claim approved successfully!");
  });

  // 83
  it("allows another status update after a failed request", async () => {
    mockUpdateClaim.mockRejectedValueOnce(new Error("Request failed"));

    await renderLoadedPage();

    approveClaim();

    await screen.findByText("Request failed");

    await waitFor(() => {
      expect(
        within(getClaimRow("CLM-001")).getByRole("button", { name: /Approve/ }),
      ).toBeEnabled();
    });

    approveClaim();

    await screen.findByText("Claim approved successfully!");

    expect(mockUpdateClaim).toHaveBeenCalledTimes(2);
  });

  // =====================================
  // CLAIM HISTORY TESTS
  // =====================================

  // 84
  it("opens the history dialog for the selected claim", async () => {
    await renderLoadedPage();

    openHistory();

    const dialog = screen.getByRole("dialog", {
      name: "Claim History — CLM-002",
    });

    expect(dialog).toHaveAttribute("aria-modal", "true");

    await within(dialog).findByText("Claim Approved");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 85
  it("includes the JWT token in the history API request", async () => {
    await renderLoadedPage();

    openHistory();

    await screen.findByText("Claim Approved");

    expect(mockGetToken).toHaveBeenCalled();

    expect(mockFetch).toHaveBeenCalledWith("/api/claims/2/history", {
      headers: {
        Authorization: "Bearer test-jwt-token",
      },
    });
  });

  // 86
  it("omits the authorization header when no token exists", async () => {
    mockGetToken.mockReturnValue(null);

    await renderLoadedPage();

    openHistory();

    await screen.findByText("Claim Approved");

    expect(mockFetch).toHaveBeenCalledWith("/api/claims/2/history", {
      headers: {},
    });
  });

  // 87
  it("displays loading while history is being retrieved", async () => {
    let resolveHistory!: (value: unknown) => void;

    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveHistory = resolve;
      }),
    );

    await renderLoadedPage();

    openHistory();

    expect(screen.getByText("Loading history...")).toBeInTheDocument();

    await act(async () => {
      resolveHistory(historyResponse(mockHistory));
    });

    expect(screen.getByText("Claim Approved")).toBeInTheDocument();

    expect(screen.queryByText("Loading history...")).not.toBeInTheDocument();
  });

  // 88
  it("displays approval and rejection history entries", async () => {
    await renderLoadedPage();

    openHistory();

    expect(await screen.findByText("Claim Approved")).toBeInTheDocument();

    expect(screen.getByText("Claim Rejected")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");

    expect(
      dialog.querySelectorAll(".claim-history-timeline-item"),
    ).toHaveLength(2);
  });

  // 89
  it("displays the current claim status", async () => {
    await renderLoadedPage();

    openHistory();

    await screen.findByText("Claim Approved");

    const currentStatus = screen
      .getByRole("dialog")
      .querySelector(".claim-history-current");

    expect(currentStatus).toHaveTextContent("Current Status:");

    expect(currentStatus).toHaveTextContent("APPROVED");
  });

  // 90
  it("formats history timestamps", async () => {
    await renderLoadedPage();

    openHistory();

    await screen.findByText("Claim Approved");

    expect(screen.getByText(/2026-11-10 10:30:00/)).toBeInTheDocument();

    expect(screen.getByText(/2026-11-11 12:45:00/)).toBeInTheDocument();
  });

  // 91
  it("handles other history statuses and missing timestamps", async () => {
    mockFetch.mockResolvedValueOnce(
      historyResponse([
        {
          id: 5,
          claimId: 2,
          previousStatus: "REJECTED",
          newStatus: "pending",
          changedAt: "",
        },
      ]),
    );

    await renderLoadedPage();

    openHistory();

    expect(
      await screen.findByText("Status Changed to PENDING"),
    ).toBeInTheDocument();

    expect(screen.getByText(/🕒 —/)).toBeInTheDocument();
  });

  // 92
  it("displays an empty history message", async () => {
    mockFetch.mockResolvedValueOnce(historyResponse([]));

    await renderLoadedPage();

    openHistory();

    expect(
      await screen.findByText(/No status changes recorded yet/),
    ).toBeInTheDocument();
  });

  // 93
  it("handles unsuccessful history HTTP responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    await renderLoadedPage();

    openHistory();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load claim history (HTTP 403).",
    );
  });

  // 94
  it("handles unexpected history response formats", async () => {
    mockFetch.mockResolvedValueOnce(
      historyResponse({ message: "Invalid response" }),
    );

    await renderLoadedPage();

    openHistory();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unexpected history response from the server.",
    );
  });

  // 95
  it("displays history network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network unavailable"));

    await renderLoadedPage();

    openHistory();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );
  });

  // 96
  it("displays a fallback history error", async () => {
    mockFetch.mockRejectedValueOnce("Unknown failure");

    await renderLoadedPage();

    openHistory();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load history.",
    );
  });

  // 97
  it("closes history using the top close button", async () => {
    await renderLoadedPage();

    openHistory();

    await screen.findByText("Claim Approved");

    clickButton("Close history dialog");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // 98 — CORRECTED TYPESCRIPT ERROR
  it("closes history using the footer close button", async () => {
    await renderLoadedPage();

    openHistory();

    await screen.findByText("Claim Approved");

    const dialog = screen.getByRole("dialog");

    const closeButton = within(dialog).getByRole("button", {
      name: /^Close$/,
    });

    fireEvent.click(closeButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // 99
  it("closes history when Escape is pressed", async () => {
    await renderLoadedPage();

    openHistory();

    await screen.findByText("Claim Approved");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // 100
  it("closes history on backdrop interaction but not inside the dialog", async () => {
    await renderLoadedPage();

    openHistory();

    await screen.findByText("Claim Approved");

    fireEvent.mouseDown(screen.getByRole("dialog"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("presentation"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // 101
  it("ignores stale history responses after another claim is opened", async () => {
    let resolveOldHistory!: (value: unknown) => void;

    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOldHistory = resolve;
      }),
    );

    await renderLoadedPage();

    openHistory("CLM-001");

    expect(screen.getByText("Loading history...")).toBeInTheDocument();

    clickButton("Close history dialog");

    mockFetch.mockResolvedValueOnce(historyResponse([]));

    openHistory("CLM-002");

    await screen.findByText(/No status changes recorded yet/);

    await act(async () => {
      resolveOldHistory(historyResponse(mockHistory));
    });

    expect(
      screen.getByRole("dialog", {
        name: "Claim History — CLM-002",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByText("Claim Approved")).not.toBeInTheDocument();
  });

  // 102
  it("ignores stale history errors after closing the dialog", async () => {
    let rejectHistory!: (reason: Error) => void;

    mockFetch.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectHistory = reject;
      }),
    );

    await renderLoadedPage();

    openHistory();

    clickButton("Close history dialog");

    await act(async () => {
      rejectHistory(new Error("Old request failed"));
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(screen.queryByText("Old request failed")).not.toBeInTheDocument();
  });

  // =====================================
  // CSV EXPORT TESTS
  // =====================================

  // 103
  it("displays an error when exporting an empty dataset", async () => {
    mockGetAllClaims.mockResolvedValue([]);

    await renderLoadedPage();

    clickButton(/Export CSV/);

    expectToast("No claims available to export.", "error");
  });

  // 104
  it("exports all sorted and filtered claims with safe CSV escaping", async () => {
    mockGetAllClaims.mockResolvedValue([
      {
        ...mockClaims[0],
        description: '=SUM("1","2")',
      },
      ...mockClaims.slice(1),
    ]);

    let exportedBlob!: Blob;

    let downloadedFile = "";

    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob;

      return "blob:claims-export";
    });

    const revokeObjectURL = vi.fn();

    class MockURL extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }

    vi.stubGlobal("URL", MockURL);

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFile = this.download;
      });

    await renderLoadedPage();

    clickButton(/^Claim Amount /);

    clickButton(/^Claim Amount /);

    clickButton(/Export CSV/);

    expect(createObjectURL).toHaveBeenCalledTimes(1);

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:claims-export");

    expect(downloadedFile).toBe("claims.csv");

    expect(clickSpy).toHaveBeenCalledTimes(1);

    expect(exportedBlob.type).toBe("text/csv;charset=utf-8;");

    const csv = await readBlob(exportedBlob);

    const rows = csv.split("\r\n");

    expect(rows).toHaveLength(8);

    expect(rows[0]).toContain('"Claim Number"');

    expect(rows[1]).toContain('"CLM-004"');

    // CSV formula injection mitigation
    expect(csv).toContain(`"'=SUM(""1"",""2"")"`);

    expectToast("Claims exported successfully!", "success");

    filterClaims("PENDING");

    clickButton(/Export CSV/);

    const filteredCSV = await readBlob(exportedBlob);

    expect(filteredCSV.split("\r\n")).toHaveLength(4);

    expect(filteredCSV).toContain('"CLM-001"');

    expect(filteredCSV).toContain('"CLM-004"');

    expect(filteredCSV).toContain('"CLM-006"');

    expect(filteredCSV).not.toContain('"CLM-002"');
  });

  // =====================================
  // TOAST NOTIFICATIONS
  // =====================================

  // 105
  it("dismisses toast notifications", async () => {
    await renderLoadedPage();

    clickButton("+ Add Claim");

    clickButton("Complete Creation");

    await screen.findByText("Claim created successfully!");

    clickButton("Close notification");

    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });
});
