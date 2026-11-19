import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import Policies from "./Policies";

import { getAllPolicies, deletePolicy } from "../services/policyService";

import { isAdmin } from "../services/roleService";
import type { Policy } from "../types/Policy";

// =====================================
// MOCK SERVICES
// =====================================

vi.mock("../services/policyService", () => ({
  getAllPolicies: vi.fn(),
  deletePolicy: vi.fn(),
}));

vi.mock("../services/roleService", () => ({
  isAdmin: vi.fn(),
}));

// =====================================
// MOCK CHILD COMPONENTS
// =====================================

vi.mock("../components/PolicyForm", () => ({
  default: ({ onPolicyCreated }: { onPolicyCreated: () => void }) => (
    <div data-testid="policy-form">
      <h3>Create Policy Form</h3>

      <button type="button" onClick={onPolicyCreated}>
        Complete Creation
      </button>
    </div>
  ),
}));

vi.mock("../components/EditPolicyForm", () => ({
  default: ({
    policy,
    onUpdated,
    onCancel,
  }: {
    policy: Policy;
    onUpdated: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="edit-policy-form">
      <h3>Edit Policy: {policy.policyNumber}</h3>

      <button type="button" onClick={onUpdated}>
        Complete Update
      </button>

      <button type="button" onClick={onCancel}>
        Cancel Editing
      </button>
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

      <button type="button" onClick={onConfirm}>
        Confirm Delete
      </button>

      <button type="button" onClick={onCancel}>
        Cancel Deletion
      </button>
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
      role={type === "error" ? "alert" : "status"}
      data-type={type}
    >
      <span>{message}</span>

      <button type="button" onClick={onClose}>
        Close notification
      </button>
    </div>
  ),
}));

vi.mock("../components/LoadingSpinner", () => ({
  default: ({ message }: { message: string }) => (
    <div role="status">{message}</div>
  ),
}));

vi.mock("../components/EmptyState", () => ({
  default: ({
    title,
    message,
  }: {
    title: string;
    message: string;
    icon?: string;
  }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  ),
}));

const mockGetAllPolicies = vi.mocked(getAllPolicies);
const mockDeletePolicy = vi.mocked(deletePolicy);
const mockIsAdmin = vi.mocked(isAdmin);

// =====================================
// MOCK POLICY DATA
// =====================================

function createMockPolicy(id: number, overrides: Partial<Policy> = {}): Policy {
  return {
    id,
    policyNumber: `POL-${String(id).padStart(3, "0")}`,
    policyHolderName: `Holder ${id}`,
    policyType: "HEALTH",
    premiumAmount: 1500,
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    status: "ACTIVE",
    ...overrides,
  };
}

const mockPolicies: Policy[] = [
  createMockPolicy(1, {
    policyHolderName: "John Smith",
    policyType: "HEALTH",
    premiumAmount: 1500,
    status: "ACTIVE",
  }),

  createMockPolicy(2, {
    policyHolderName: "Jane Doe",
    policyType: "AUTO",
    premiumAmount: 2500,
    status: "INACTIVE",
  }),

  createMockPolicy(3, {
    policyHolderName: "Michael Brown",
    policyType: "LIFE",
    premiumAmount: 1000,
    status: "EXPIRED",
  }),

  createMockPolicy(4, {
    policyHolderName: "Sarah Wilson",
    policyType: "HOME",
    premiumAmount: 3500,
    status: "CANCELLED",
  }),

  createMockPolicy(5, {
    policyHolderName: "David Miller",
    policyType: "HEALTH",
    premiumAmount: 2000,
    status: "ACTIVE",
  }),

  createMockPolicy(6, {
    policyHolderName: "Emily Davis",
    policyType: "AUTO",
    premiumAmount: 3000,
    status: "ACTIVE",
  }),

  createMockPolicy(7, {
    policyHolderName: "Robert Taylor",
    policyType: "LIFE",
    premiumAmount: 500,
    status: "INACTIVE",
  }),
];

// =====================================
// HELPER FUNCTIONS
// =====================================

async function renderLoadedPage(initialStatusFilter = "ALL") {
  const result = render(<Policies initialStatusFilter={initialStatusFilter} />);

  await screen.findByRole("heading", {
    name: "Policy Management",
  });

  return result;
}

function searchPolicies(value: string) {
  fireEvent.change(screen.getByLabelText("Search policies"), {
    target: { value },
  });
}

function filterPolicies(value: string) {
  fireEvent.change(screen.getByLabelText("Filter policies by status"), {
    target: { value },
  });
}

function clickButton(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function getPolicyRows() {
  const table = screen.queryByRole("table");

  if (!table) return [];

  return within(table).getAllByRole("row").slice(1);
}

function getVisiblePolicyNumbers() {
  return getPolicyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent,
  );
}

function getVisiblePolicyIds() {
  return getPolicyRows().map((row) =>
    Number(within(row).getAllByRole("cell")[0].textContent),
  );
}

function openActions(policyNumber = "POL-001") {
  clickButton(`More actions for ${policyNumber}`);
}

function openEdit(policyNumber = "POL-001") {
  openActions(policyNumber);

  fireEvent.click(
    screen.getByRole("menuitem", {
      name: /Edit Policy/,
    }),
  );
}

function openDelete(policyNumber = "POL-001") {
  openActions(policyNumber);

  fireEvent.click(
    screen.getByRole("menuitem", {
      name: /Delete Policy/,
    }),
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
// POLICIES PAGE TESTS
// =====================================

describe("Policies Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockIsAdmin.mockReturnValue(true);

    mockGetAllPolicies.mockResolvedValue(mockPolicies);

    mockDeletePolicy.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Page heading

  it("should render the policy management heading", async () => {
    await renderLoadedPage();

    expect(
      screen.getByRole("heading", {
        name: "Policy Management",
      }),
    ).toBeInTheDocument();
  });

  // 2. Page controls

  it("should render search, filter, refresh and export controls", async () => {
    await renderLoadedPage();

    expect(screen.getByLabelText("Search policies")).toBeInTheDocument();

    expect(
      screen.getByLabelText("Filter policies by status"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Refresh/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Export CSV/,
      }),
    ).toBeInTheDocument();
  });

  // 3. Table headers

  it("should render all policy table headers", async () => {
    await renderLoadedPage();

    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent);

    expect(headers).toEqual([
      "ID ↑",
      "Policy Number ↕",
      "Policy Holder",
      "Policy Type",
      "Premium ↕",
      "Start Date",
      "End Date",
      "Status ↕",
      "Actions",
    ]);
  });

  // 4. Policy information

  it("should display policy information correctly", async () => {
    await renderLoadedPage();

    const row = getPolicyRows()[0];

    expect(row).toHaveTextContent("POL-001");
    expect(row).toHaveTextContent("John Smith");
    expect(row).toHaveTextContent("HEALTH");
    expect(row).toHaveTextContent("2026-01-01");
    expect(row).toHaveTextContent("2027-01-01");
  });

  // 5. Premium formatting

  it("should format premiums to two decimal places", async () => {
    await renderLoadedPage();

    expect(
      within(getPolicyRows()[0]).getByText("$1500.00"),
    ).toBeInTheDocument();

    expect(
      within(getPolicyRows()[1]).getByText("$2500.00"),
    ).toBeInTheDocument();
  });

  // 6. Status badges

  it("should render status badges with appropriate CSS classes", async () => {
    await renderLoadedPage();

    expect(within(getPolicyRows()[0]).getByText("ACTIVE")).toHaveClass(
      "status-badge",
      "active",
    );

    expect(within(getPolicyRows()[1]).getByText("INACTIVE")).toHaveClass(
      "status-badge",
      "inactive",
    );

    expect(within(getPolicyRows()[2]).getByText("EXPIRED")).toHaveClass(
      "status-badge",
      "expired",
    );

    expect(within(getPolicyRows()[3]).getByText("CANCELLED")).toHaveClass(
      "status-badge",
      "cancelled",
    );
  });

  // 7. Status filter options

  it("should render all available status filter options", async () => {
    await renderLoadedPage();

    const select = screen.getByLabelText("Filter policies by status");

    const options = within(select)
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);

    expect(options).toEqual([
      "ALL",
      "ACTIVE",
      "INACTIVE",
      "EXPIRED",
      "CANCELLED",
    ]);
  });

  // =====================================
  // LOADING AND ERROR HANDLING
  // =====================================

  // 8. Loading state

  it("should show a loading spinner while retrieving policies", async () => {
    let resolvePolicies!: (value: Policy[]) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((resolve) => {
        resolvePolicies = resolve;
      }),
    );

    render(<Policies />);

    expect(screen.getByText("Loading policies...")).toBeInTheDocument();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await act(async () => {
      resolvePolicies(mockPolicies);
    });

    expect(screen.queryByText("Loading policies...")).not.toBeInTheDocument();

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  // 9. Initial API request

  it("should retrieve policies on mount", async () => {
    await renderLoadedPage();

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);
  });

  // 10. API failure

  it("should display an alert when loading policies fails", async () => {
    mockGetAllPolicies.mockRejectedValueOnce(new Error("Network error"));

    render(<Policies />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load policies.",
    );

    expect(
      screen.getByRole("button", {
        name: "Try Again",
      }),
    ).toBeInTheDocument();
  });

  // 11. Retry

  it("should retry loading policies after an API failure", async () => {
    mockGetAllPolicies.mockRejectedValueOnce(new Error("Network error"));

    render(<Policies />);

    await screen.findByRole("alert");

    clickButton("Try Again");

    await screen.findByRole("table");

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(2);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // 12. Manual refresh

  it("should retrieve updated data when Refresh is clicked", async () => {
    await renderLoadedPage();

    mockGetAllPolicies.mockResolvedValueOnce([mockPolicies[0]]);

    clickButton(/Refresh/);

    await waitFor(() => {
      expect(getVisiblePolicyIds()).toEqual([1]);
    });

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(2);
  });

  // 13. Successful request after unmount

  it("should safely handle a request resolving after unmount", async () => {
    let resolvePolicies!: (value: Policy[]) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((resolve) => {
        resolvePolicies = resolve;
      }),
    );

    const { unmount } = render(<Policies />);

    unmount();

    await act(async () => {
      resolvePolicies(mockPolicies);
    });

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // 14. Failed request after unmount

  it("should safely handle a request rejecting after unmount", async () => {
    let rejectPolicies!: (reason: Error) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((_, reject) => {
        rejectPolicies = reject;
      }),
    );

    const { unmount } = render(<Policies />);

    unmount();

    await act(async () => {
      rejectPolicies(new Error("Request failed"));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // =====================================
  // EMPTY STATE TESTS
  // =====================================

  // 15. No policies

  it("should display an empty state when no policies exist", async () => {
    mockGetAllPolicies.mockResolvedValue([]);

    await renderLoadedPage();

    expect(
      screen.getByRole("heading", {
        name: "No Policies Found",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "You haven't created any policies yet. Use the form above to add your first policy.",
      ),
    ).toBeInTheDocument();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // 16. No matching records

  it("should display a different empty message when no search results match", async () => {
    await renderLoadedPage();

    searchPolicies("nonexistent-policy");

    expect(
      screen.getByText("No policies match your search or selected filter."),
    ).toBeInTheDocument();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // 17. Empty pagination

  it("should disable pagination when no policies exist", async () => {
    mockGetAllPolicies.mockResolvedValue([]);

    await renderLoadedPage();

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  // =====================================
  // ROLE-BASED ACCESS TESTS
  // =====================================

  // 18. Admin controls

  it("should display management controls for administrators", async () => {
    await renderLoadedPage();

    expect(
      screen.getByRole("button", {
        name: "+ Add Policy",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("columnheader", {
        name: "Actions",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", {
        name: /More actions for/,
      }),
    ).toHaveLength(5);
  });

  // 19. Regular user access

  it("should hide policy management controls for regular users", async () => {
    mockIsAdmin.mockReturnValue(false);

    await renderLoadedPage();

    expect(
      screen.queryByRole("button", {
        name: "+ Add Policy",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("columnheader", {
        name: "Actions",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /More actions for/,
      }),
    ).not.toBeInTheDocument();
  });

  // 20. Read-only controls

  it("should allow regular users to view, search, filter and export policies", async () => {
    mockIsAdmin.mockReturnValue(false);

    await renderLoadedPage();

    expect(screen.getByRole("table")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Export CSV/,
      }),
    ).toBeEnabled();

    searchPolicies("HEALTH");

    expect(getVisiblePolicyIds()).toEqual([1, 5]);

    filterPolicies("INACTIVE");

    expect(getVisiblePolicyIds()).toEqual([]);
  });

  // =====================================
  // SEARCH TESTS
  // =====================================

  // 21–24. Searchable fields

  it.each([
    ["POL-003", [3]],
    ["John Smith", [1]],
    ["AUTO", [2, 6]],
    ["EXPIRED", [3]],
  ] as const)("should search policies using %s", async (term, expectedIds) => {
    await renderLoadedPage();

    searchPolicies(term);

    expect(getVisiblePolicyIds()).toEqual(expectedIds);
  });

  // 25. Normalized search

  it("should perform a case-insensitive and trimmed search", async () => {
    await renderLoadedPage();

    searchPolicies("  jOhN sMiTh  ");

    expect(getVisiblePolicyIds()).toEqual([1]);
  });

  // 26. Partial matching

  it("should support partial search matches", async () => {
    await renderLoadedPage();

    searchPolicies("smit");

    expect(getVisiblePolicyIds()).toEqual([1]);
  });

  // 27. Clear search

  it("should restore the policy list when search is cleared", async () => {
    await renderLoadedPage();

    searchPolicies("Jane Doe");

    expect(getVisiblePolicyIds()).toEqual([2]);

    searchPolicies("");

    expect(getVisiblePolicyIds()).toEqual([1, 2, 3, 4, 5]);
  });

  // =====================================
  // FILTER TESTS
  // =====================================

  // 28–31. Status filters

  it.each([
    ["ACTIVE", [1, 5, 6]],
    ["INACTIVE", [2, 7]],
    ["EXPIRED", [3]],
    ["CANCELLED", [4]],
  ] as const)(
    "should filter policies by %s status",
    async (status, expectedIds) => {
      await renderLoadedPage();

      filterPolicies(status);

      expect(getVisiblePolicyIds()).toEqual(expectedIds);
    },
  );

  // 32. Combined search and filter

  it("should combine search and status filtering", async () => {
    await renderLoadedPage();

    searchPolicies("AUTO");

    filterPolicies("ACTIVE");

    expect(getVisiblePolicyIds()).toEqual([6]);
  });

  // 33. Initial filter

  it("should apply the initialStatusFilter prop", async () => {
    await renderLoadedPage("EXPIRED");

    expect(screen.getByLabelText("Filter policies by status")).toHaveValue(
      "EXPIRED",
    );

    expect(getVisiblePolicyIds()).toEqual([3]);
  });

  // 34. Changed initial filter

  it("should update the filter when initialStatusFilter changes", async () => {
    const { rerender } = await renderLoadedPage();

    rerender(<Policies initialStatusFilter="CANCELLED" />);

    expect(getVisiblePolicyIds()).toEqual([4]);

    expect(screen.getByLabelText("Filter policies by status")).toHaveValue(
      "CANCELLED",
    );
  });

  // =====================================
  // SORTING TESTS
  // =====================================

  // 35. Default sort

  it("should sort policies by ID ascending by default", async () => {
    mockGetAllPolicies.mockResolvedValue([...mockPolicies].reverse());

    await renderLoadedPage();

    expect(getVisiblePolicyIds()).toEqual([1, 2, 3, 4, 5]);
  });

  // 36. ID sorting

  it("should toggle ID sorting between descending and ascending", async () => {
    await renderLoadedPage();

    clickButton(/^ID /);

    expect(getVisiblePolicyIds()).toEqual([7, 6, 5, 4, 3]);

    expect(screen.getByRole("button", { name: "ID ↓" })).toBeInTheDocument();

    clickButton(/^ID /);

    expect(getVisiblePolicyIds()).toEqual([1, 2, 3, 4, 5]);
  });

  // 37. Policy number sorting

  it("should sort policy numbers in both directions", async () => {
    mockGetAllPolicies.mockResolvedValue([
      createMockPolicy(1, {
        policyNumber: "POL-C",
      }),
      createMockPolicy(2, {
        policyNumber: "POL-A",
      }),
      createMockPolicy(3, {
        policyNumber: "POL-B",
      }),
    ]);

    await renderLoadedPage();

    clickButton(/^Policy Number /);

    expect(getVisiblePolicyNumbers()).toEqual(["POL-A", "POL-B", "POL-C"]);

    clickButton(/^Policy Number /);

    expect(getVisiblePolicyNumbers()).toEqual(["POL-C", "POL-B", "POL-A"]);
  });

  // 38. Premium sorting

  it("should sort premiums numerically in both directions", async () => {
    await renderLoadedPage();

    clickButton(/^Premium /);

    expect(getVisiblePolicyIds()).toEqual([7, 3, 1, 5, 2]);

    clickButton(/^Premium /);

    expect(getVisiblePolicyIds()).toEqual([4, 6, 2, 5, 1]);
  });

  // 39. Status sorting

  it("should sort policies alphabetically by status", async () => {
    await renderLoadedPage();

    clickButton(/^Status /);

    expect(getVisiblePolicyIds()).toEqual([1, 5, 6, 4, 3]);

    clickButton(/^Status /);

    expect(getVisiblePolicyIds()).toEqual([2, 7, 3, 4, 1]);

    // Correct descending order is verified below
    // using the actual status values.
  });

  // =====================================
  // PAGINATION TESTS
  // =====================================

  // 40. Initial page

  it("should display five policies per page", async () => {
    await renderLoadedPage();

    expect(getPolicyRows()).toHaveLength(5);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  // 41. Next page

  it("should navigate to the next page", async () => {
    await renderLoadedPage();

    clickButton("Next");

    expect(getVisiblePolicyIds()).toEqual([6, 7]);

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  // 42. Previous page

  it("should navigate back to the previous page", async () => {
    await renderLoadedPage();

    clickButton("Next");

    clickButton("Previous");

    expect(getVisiblePolicyIds()).toEqual([1, 2, 3, 4, 5]);
  });

  // 43. Search resets pagination

  it("should reset pagination when searching", async () => {
    await renderLoadedPage();

    clickButton("Next");

    searchPolicies("John Smith");

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();

    expect(getVisiblePolicyIds()).toEqual([1]);
  });

  // 44. Filter resets pagination

  it("should reset pagination when filtering", async () => {
    await renderLoadedPage();

    clickButton("Next");

    filterPolicies("ACTIVE");

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();

    expect(getVisiblePolicyIds()).toEqual([1, 5, 6]);
  });

  // 45. Sorting resets pagination

  it("should reset pagination when sorting changes", async () => {
    await renderLoadedPage();

    clickButton("Next");

    clickButton(/^Premium /);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    expect(getVisiblePolicyIds()).toEqual([7, 3, 1, 5, 2]);
  });

  // 46. Safe current page

  it("should handle a refresh that reduces the number of available pages", async () => {
    await renderLoadedPage();

    clickButton("Next");

    mockGetAllPolicies.mockResolvedValueOnce([mockPolicies[0]]);

    clickButton(/Refresh/);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    });

    expect(getVisiblePolicyIds()).toEqual([1]);
  });

  // =====================================
  // CREATE POLICY TESTS
  // =====================================

  // 47. Open and close create form

  it("should toggle the create policy form", async () => {
    await renderLoadedPage();

    expect(screen.queryByTestId("policy-form")).not.toBeInTheDocument();

    clickButton("+ Add Policy");

    expect(screen.getByTestId("policy-form")).toBeInTheDocument();

    clickButton("Cancel");

    expect(screen.queryByTestId("policy-form")).not.toBeInTheDocument();
  });

  // 48. Successful creation

  it("should refresh policies and show a success toast after creation", async () => {
    await renderLoadedPage();

    clickButton("+ Add Policy");

    clickButton("Complete Creation");

    await screen.findByText("Policy created successfully!");

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(2);

    expect(screen.queryByTestId("policy-form")).not.toBeInTheDocument();

    expectToast("Policy created successfully!", "success");
  });

  // =====================================
  // ACTION MENU TESTS
  // =====================================

  // 49. Portal menu

  it("should open an accessible action menu using a portal", async () => {
    const { container } = await renderLoadedPage();

    openActions();

    const menu = screen.getByRole("menu");

    expect(menu.parentElement).toBe(document.body);

    expect(container).not.toContainElement(menu);

    expect(
      screen.getByRole("menuitem", {
        name: /Edit Policy/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("menuitem", {
        name: /Delete Policy/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "More actions for POL-001",
      }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  // 50. Toggle same menu

  it("should close the menu when the same action button is clicked again", async () => {
    await renderLoadedPage();

    openActions();

    openActions();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 51. Switch menus

  it("should switch the action menu to another policy", async () => {
    await renderLoadedPage();

    openActions("POL-001");

    openActions("POL-002");

    expect(
      screen.getByRole("button", {
        name: "More actions for POL-001",
      }),
    ).toHaveAttribute("aria-expanded", "false");

    expect(
      screen.getByRole("button", {
        name: "More actions for POL-002",
      }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  // 52. Escape key

  it("should close the action menu when Escape is pressed", async () => {
    await renderLoadedPage();

    openActions();

    fireEvent.keyDown(document, {
      key: "Enter",
    });

    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, {
      key: "Escape",
    });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 53. Pointer interaction

  it("should close the menu on outside pointer interaction but not inside interaction", async () => {
    await renderLoadedPage();

    openActions();

    fireEvent.pointerDown(screen.getByRole("menu"));

    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 54. Scroll and resize

  it("should close the menu when the window scrolls or resizes", async () => {
    await renderLoadedPage();

    openActions();

    fireEvent.scroll(window);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    openActions();

    fireEvent.resize(window);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // =====================================
  // EDIT POLICY TESTS
  // =====================================

  // 55. Open edit form

  it("should open the edit form for the selected policy", async () => {
    await renderLoadedPage();

    openEdit("POL-002");

    expect(screen.getByTestId("edit-policy-form")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Edit Policy: POL-002",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // 56. Cancel editing

  it("should close the edit form when editing is cancelled", async () => {
    await renderLoadedPage();

    openEdit();

    clickButton("Cancel Editing");

    expect(screen.queryByTestId("edit-policy-form")).not.toBeInTheDocument();

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);
  });

  // 57. Successful update

  it("should close the edit form, refresh policies and show a success toast", async () => {
    await renderLoadedPage();

    openEdit();

    clickButton("Complete Update");

    await screen.findByText("Policy updated successfully!");

    expect(screen.queryByTestId("edit-policy-form")).not.toBeInTheDocument();

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(2);

    expectToast("Policy updated successfully!", "success");
  });

  // =====================================
  // DELETE POLICY TESTS
  // =====================================

  // 58. Delete confirmation

  it("should open a confirmation modal for the selected policy", async () => {
    await renderLoadedPage();

    openDelete("POL-002");

    expect(screen.getByRole("dialog")).toHaveTextContent("Delete POL-002?");

    expect(mockDeletePolicy).not.toHaveBeenCalled();
  });

  // 59. Cancel deletion

  it("should cancel deletion without calling the API", async () => {
    await renderLoadedPage();

    openDelete();

    clickButton("Cancel Deletion");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(mockDeletePolicy).not.toHaveBeenCalled();
  });

  // 60. Successful deletion

  it("should delete the correct policy and refresh the table", async () => {
    await renderLoadedPage();

    mockGetAllPolicies.mockResolvedValueOnce(
      mockPolicies.filter((policy) => policy.id !== 1),
    );

    openDelete("POL-001");

    clickButton("Confirm Delete");

    await screen.findByText("Policy deleted successfully!");

    expect(mockDeletePolicy).toHaveBeenCalledWith(1);

    expect(mockDeletePolicy).toHaveBeenCalledTimes(1);

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(2);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("POL-001")).not.toBeInTheDocument();
    });

    expectToast("Policy deleted successfully!", "success");
  });

  // 61. Failed deletion

  it("should display an error toast when deletion fails", async () => {
    mockDeletePolicy.mockRejectedValueOnce(
      new Error("Associated claims exist"),
    );

    await renderLoadedPage();

    openDelete();

    clickButton("Confirm Delete");

    await screen.findByText(
      "Failed to delete policy. It may have associated claims.",
    );

    expectToast(
      "Failed to delete policy. It may have associated claims.",
      "error",
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    expect(screen.getByText("POL-001")).toBeInTheDocument();

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);
  });

  // 62. Pending deletion guard

  it("should prevent duplicate deletion and cancellation while deleting", async () => {
    let resolveDelete!: () => void;

    mockDeletePolicy.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );

    await renderLoadedPage();

    openDelete();

    clickButton("Confirm Delete");

    clickButton("Confirm Delete");

    clickButton("Cancel Deletion");

    expect(mockDeletePolicy).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      resolveDelete();
    });

    await screen.findByText("Policy deleted successfully!");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // =====================================
  // CSV EXPORT TESTS
  // =====================================

  // 63. Empty export

  it("should display an error when exporting an empty dataset", async () => {
    mockGetAllPolicies.mockResolvedValue([]);

    await renderLoadedPage();

    clickButton(/Export CSV/);

    expectToast("No policies available to export.", "error");
  });

  // 64. CSV download, sorting and escaping

  it("should export all matching sorted records with safe CSV escaping", async () => {
    const policies = [
      ...mockPolicies.slice(1),
      {
        ...mockPolicies[0],
        policyHolderName: '=SUM("1","2")',
      },
    ];

    mockGetAllPolicies.mockResolvedValue(policies);

    let exportedBlob: Blob | undefined;

    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob;
      return "blob:policies-export";
    });

    const revokeObjectURL = vi.fn();

    class MockURL extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }

    vi.stubGlobal("URL", MockURL);

    let downloadedFile = "";

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFile = this.download;

        expect(this.href).toBe("blob:policies-export");
      });

    await renderLoadedPage();

    // Descending premium order
    clickButton(/^Premium /);
    clickButton(/^Premium /);

    // Exports all records, not only the first page.
    clickButton(/Export CSV/);

    expect(createObjectURL).toHaveBeenCalledTimes(1);

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:policies-export");

    expect(clickSpy).toHaveBeenCalledTimes(1);

    expect(downloadedFile).toBe("policies.csv");

    expect(exportedBlob).toBeDefined();

    expect(exportedBlob!.type).toBe("text/csv;charset=utf-8;");

    const csv = await readBlob(exportedBlob!);

    const rows = csv.split("\r\n");

    expect(rows).toHaveLength(8);

    expect(rows[0]).toContain('"Policy Number"');

    expect(rows[1]).toContain('"POL-004"');

    expect(csv).toContain(`"'=SUM(""1"",""2"")"`);

    expectToast("Policies exported successfully!", "success");

    // Verify that the active filter also applies to export.
    filterPolicies("ACTIVE");

    clickButton(/Export CSV/);

    const filteredCSV = await readBlob(exportedBlob!);

    expect(filteredCSV.split("\r\n")).toHaveLength(4);

    expect(filteredCSV).toContain('"POL-001"');
    expect(filteredCSV).toContain('"POL-005"');
    expect(filteredCSV).toContain('"POL-006"');

    expect(filteredCSV).not.toContain('"POL-002"');
  });

  // =====================================
  // TOAST NOTIFICATION TESTS
  // =====================================

  // 65. Close toast

  it("should dismiss a notification when its close button is clicked", async () => {
    await renderLoadedPage();

    clickButton("+ Add Policy");

    clickButton("Complete Creation");

    await screen.findByText("Policy created successfully!");

    clickButton("Close notification");

    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });
});
