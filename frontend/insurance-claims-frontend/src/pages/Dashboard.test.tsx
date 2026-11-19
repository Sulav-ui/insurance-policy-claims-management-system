import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import Dashboard from "./Dashboard";

import { getAllPolicies } from "../services/policyService";
import { getAllClaims } from "../services/claimService";
import { getToken } from "../services/authService";

import type { Policy } from "../types/Policy";
import type { Claim } from "../types/Claim";

// =====================================
// MOCK SERVICES
// =====================================

vi.mock("../services/policyService", () => ({
  getAllPolicies: vi.fn(),
}));

vi.mock("../services/claimService", () => ({
  getAllClaims: vi.fn(),
}));

vi.mock("../services/authService", () => ({
  getToken: vi.fn(),
}));

const mockGetAllPolicies = vi.mocked(getAllPolicies);
const mockGetAllClaims = vi.mocked(getAllClaims);
const mockGetToken = vi.mocked(getToken);

const mockFetch = vi.fn();
const mockNavigate = vi.fn();

// =====================================
// TEST DATA
// =====================================

function createMockPolicy(id: number, overrides: Partial<Policy> = {}): Policy {
  return {
    id,
    policyNumber: `POL-${String(id).padStart(3, "0")}`,
    policyHolderName: `Policy Holder ${id}`,
    policyType: "HEALTH",
    premiumAmount: 1000,
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    status: "ACTIVE",
    ...overrides,
  };
}

function createMockClaim(id: number, overrides: Partial<Claim> = {}): Claim {
  return {
    id,
    claimNumber: `CLM-${String(id).padStart(3, "0")}`,
    claimAmount: 1000,
    claimDate: "2026-11-01",
    description: "Insurance claim",
    status: "PENDING",
    policyId: 1,
    ...overrides,
  };
}

const mockPolicies: Policy[] = [
  createMockPolicy(1, {
    premiumAmount: 1500,
    status: "ACTIVE",
  }),

  createMockPolicy(2, {
    premiumAmount: 2500,
    status: "ACTIVE",
  }),

  createMockPolicy(3, {
    premiumAmount: 1000,
    status: "EXPIRED",
  }),

  createMockPolicy(4, {
    premiumAmount: 3500,
    status: "CANCELLED",
  }),

  createMockPolicy(5, {
    premiumAmount: 2000,
    status: "ACTIVE",
  }),

  createMockPolicy(6, {
    premiumAmount: 500,
    status: "INACTIVE",
  }),
];

const mockClaims: Claim[] = [
  createMockClaim(1, {
    claimAmount: 1800,
    claimDate: "2026-11-10",
    status: "PENDING",
  }),

  createMockClaim(2, {
    claimAmount: 2500,
    claimDate: "2026-11-15",
    status: "APPROVED",
  }),

  createMockClaim(3, {
    claimAmount: 500,
    claimDate: "2026-10-20",
    status: "REJECTED",
  }),

  createMockClaim(4, {
    claimAmount: 3500,
    claimDate: "2026-09-12",
    status: "PENDING",
  }),

  createMockClaim(5, {
    claimAmount: 2000,
    claimDate: "2026-08-05",
    status: "APPROVED",
  }),

  createMockClaim(6, {
    claimAmount: 3000,
    claimDate: "2026-06-10",
    status: "APPROVED",
  }),

  createMockClaim(7, {
    claimAmount: 750,
    claimDate: "2026-05-18",
    status: "REJECTED",
  }),
];

const mockSummary = {
  totalPolicies: 6,
  activePolicies: 3,
  totalClaims: 7,
  pendingClaims: 2,
  totalClaimAmount: 14050,
};

const emptySummary = {
  totalPolicies: 0,
  activePolicies: 0,
  totalClaims: 0,
  pendingClaims: 0,
  totalClaimAmount: 0,
};

// =====================================
// MOCK RESPONSE HELPERS
// =====================================

function createSummaryResponse(data: unknown = mockSummary) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
  };
}

function createErrorResponse(status: number) {
  return {
    ok: false,
    status,
    json: vi.fn(),
  };
}

// =====================================
// TEST HELPERS
// =====================================

function renderDashboard() {
  return render(<Dashboard onNavigate={mockNavigate} />);
}

async function renderLoadedDashboard() {
  const result = renderDashboard();

  await screen.findByRole("heading", {
    name: "Insurance Dashboard",
  });

  return result;
}

function getSection(heading: string): HTMLElement {
  const section = screen
    .getByRole("heading", { name: heading })
    .closest("section");

  if (!section) {
    throw new Error(`Section not found: ${heading}`);
  }

  return section;
}

function getSummaryCard(title: string): HTMLElement {
  const card = screen.getByRole("heading", { name: title }).closest("button");

  if (!card) {
    throw new Error(`Summary card not found: ${title}`);
  }

  return card;
}

function getSummaryCardValue(title: string) {
  return getSummaryCard(title).querySelector("p")?.textContent;
}

// CORRECTED: supports adjacent label and count text
function getStatusOverviewButton(label: string) {
  return within(getSection("Status Overview")).getByRole("button", {
    name: new RegExp(`^${label}\\s*\\d+$`),
  });
}

function getFinancialPanel(label: string): HTMLElement {
  const panel = screen
    .getByText(label, { exact: true })
    .closest(".analytics-panel");

  if (!panel) {
    throw new Error(`Financial panel not found: ${label}`);
  }

  return panel as HTMLElement;
}

function getFinancialValue(label: string) {
  return getFinancialPanel(label).querySelector("strong")?.textContent;
}

// CORRECTED: supports names such as ACTIVE3 (50.0%)
function getStatusChartRow(heading: string, status: string) {
  return within(getSection(heading)).getByRole("button", {
    name: new RegExp(`^${status}\\s*\\d+`),
  });
}

function getMonthBars(): HTMLElement[] {
  return Array.from(
    getSection("Monthly Claims Trend").querySelectorAll<HTMLElement>("[title]"),
  );
}

function getMonthTitles() {
  return getMonthBars().map((bar) => bar.getAttribute("title"));
}

function changeDateRange(range: "3" | "6" | "12" | "all") {
  fireEvent.change(
    screen.getByRole("combobox", {
      name: "Monthly claims date range",
    }),
    {
      target: { value: range },
    },
  );
}

function getRecentClaimRows() {
  const table = within(getSection("Recent Claims")).queryByRole("table");

  if (!table) return [];

  return within(table).getAllByRole("row").slice(1);
}

function getRecentClaimNumbers() {
  return getRecentClaimRows().map(
    (row) => within(row).getAllByRole("cell")[0].textContent,
  );
}

function clickButton(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

// =====================================
// DASHBOARD PAGE TESTS
// =====================================

describe("Dashboard Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));

    mockGetToken.mockReturnValue("test-jwt-token");

    mockGetAllPolicies.mockResolvedValue(mockPolicies);

    mockGetAllClaims.mockResolvedValue(mockClaims);

    mockFetch.mockResolvedValue(createSummaryResponse());

    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1
  it("renders the dashboard heading", async () => {
    await renderLoadedDashboard();

    expect(
      screen.getByRole("heading", {
        name: "Insurance Dashboard",
      }),
    ).toBeInTheDocument();
  });

  // 2
  it("renders the dashboard subtitle", async () => {
    await renderLoadedDashboard();

    expect(
      screen.getByText("Policies, claims, and performance at a glance"),
    ).toBeInTheDocument();
  });

  // 3
  it("renders the dashboard container", async () => {
    const { container } = await renderLoadedDashboard();

    expect(
      container.querySelector(".dashboard.analytics-dashboard"),
    ).toBeInTheDocument();
  });

  // 4
  it("displays the current date", async () => {
    await renderLoadedDashboard();

    expect(screen.getByText("November 18, 2026")).toBeInTheDocument();
  });

  // 5
  it("displays the data loaded indicator", async () => {
    await renderLoadedDashboard();

    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });

  // 6
  it("renders the refresh button", async () => {
    await renderLoadedDashboard();

    expect(
      screen.getByRole("button", {
        name: "Refresh",
      }),
    ).toBeEnabled();
  });

  // 7
  it("renders all four summary cards", async () => {
    const { container } = await renderLoadedDashboard();

    expect(container.querySelectorAll(".dashboard-card")).toHaveLength(4);

    expect(getSummaryCard("Total Policies")).toBeInTheDocument();

    expect(getSummaryCard("Active Policies")).toBeInTheDocument();

    expect(getSummaryCard("Total Claims")).toBeInTheDocument();

    expect(getSummaryCard("Pending Claims")).toBeInTheDocument();
  });

  // 8
  it("renders all dashboard analytics sections", async () => {
    await renderLoadedDashboard();

    [
      "Status Overview",
      "Policies by Status",
      "Claims by Status",
      "Monthly Claims Trend",
      "Recent Claims",
    ].forEach((heading) => {
      expect(
        screen.getByRole("heading", {
          name: heading,
        }),
      ).toBeInTheDocument();
    });
  });

  // =====================================
  // API INTEGRATION AND AUTHENTICATION
  // =====================================

  // 9
  it("retrieves the JWT token", async () => {
    await renderLoadedDashboard();

    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });

  // 10
  it("requests policies when the dashboard mounts", async () => {
    await renderLoadedDashboard();

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);
  });

  // 11
  it("requests claims when the dashboard mounts", async () => {
    await renderLoadedDashboard();

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);
  });

  // 12
  it("requests the backend dashboard summary", async () => {
    await renderLoadedDashboard();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    expect(mockFetch).toHaveBeenCalledWith("/api/dashboard/summary", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-jwt-token",
        Accept: "application/json",
      },
    });
  });

  // 13
  it("parses the dashboard summary response", async () => {
    const response = createSummaryResponse();

    mockFetch.mockResolvedValueOnce(response);

    await renderLoadedDashboard();

    expect(response.json).toHaveBeenCalledTimes(1);
  });

  // 14
  it("prevents API requests when no JWT token exists", async () => {
    mockGetToken.mockReturnValue(null);

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Session expired. Please log in again.",
    );

    expect(mockGetAllPolicies).not.toHaveBeenCalled();

    expect(mockGetAllClaims).not.toHaveBeenCalled();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  // =====================================
  // LOADING AND ERROR HANDLING
  // =====================================

  // 15
  it("displays the loading state", async () => {
    let resolvePolicies!: (value: Policy[]) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((resolve) => {
        resolvePolicies = resolve;
      }),
    );

    renderDashboard();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading dashboard...",
    );

    expect(
      screen.queryByRole("heading", {
        name: "Insurance Dashboard",
      }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolvePolicies(mockPolicies);
    });

    expect(
      await screen.findByRole("heading", {
        name: "Insurance Dashboard",
      }),
    ).toBeInTheDocument();
  });

  // 16
  it("waits for all dashboard API requests", async () => {
    let resolveClaims!: (value: Claim[]) => void;

    let resolveSummary!: (value: unknown) => void;

    mockGetAllClaims.mockReturnValueOnce(
      new Promise<Claim[]>((resolve) => {
        resolveClaims = resolve;
      }),
    );

    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSummary = resolve;
      }),
    );

    renderDashboard();

    await act(async () => {
      resolveClaims(mockClaims);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading dashboard...",
    );

    await act(async () => {
      resolveSummary(createSummaryResponse());
    });

    expect(
      await screen.findByRole("heading", {
        name: "Insurance Dashboard",
      }),
    ).toBeInTheDocument();
  });

  // 17
  it("handles a policy service error", async () => {
    mockGetAllPolicies.mockRejectedValueOnce(
      new Error("Failed to load policies"),
    );

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load policies",
    );
  });

  // 18
  it("handles a claim service error", async () => {
    mockGetAllClaims.mockRejectedValueOnce(new Error("Failed to load claims"));

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load claims",
    );
  });

  // 19
  it("handles a dashboard network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network unavailable"));

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );
  });

  // 20
  it("handles an expired session response", async () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse(401));

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session has expired. Please log in again.",
    );
  });

  // 21
  it("handles a forbidden dashboard response", async () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse(403));

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to view the dashboard.",
    );
  });

  // 22
  it("handles other unsuccessful HTTP responses", async () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse(500));

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load dashboard summary (500)",
    );
  });

  // 23
  it("handles invalid JSON in the summary response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected JSON")),
    });

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unexpected JSON",
    );
  });

  // 24
  it("displays a fallback message for non-Error failures", async () => {
    mockFetch.mockRejectedValueOnce("Unknown failure");

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load dashboard",
    );
  });

  // 25
  it("ignores successful responses after unmounting", async () => {
    let resolveSummary!: (value: unknown) => void;

    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSummary = resolve;
      }),
    );

    const { unmount } = renderDashboard();

    unmount();

    await act(async () => {
      resolveSummary(createSummaryResponse());
    });

    expect(
      screen.queryByRole("heading", {
        name: "Insurance Dashboard",
      }),
    ).not.toBeInTheDocument();
  });

  // 26
  it("ignores failed responses after unmounting", async () => {
    let rejectSummary!: (reason: Error) => void;

    mockFetch.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectSummary = reject;
      }),
    );

    const { unmount } = renderDashboard();

    unmount();

    await act(async () => {
      rejectSummary(new Error("Request failed"));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // =====================================
  // SUMMARY CARD TESTS
  // =====================================

  // 27–30
  it.each([
    ["Total Policies", "6"],
    ["Active Policies", "3"],
    ["Total Claims", "7"],
    ["Pending Claims", "2"],
  ] as const)(
    "displays the correct summary count for %s",
    async (title, expectedCount) => {
      await renderLoadedDashboard();

      expect(getSummaryCardValue(title)).toBe(expectedCount);

      expect(getSummaryCard(title)).toHaveTextContent("Click to view details");
    },
  );

  // 31–34
  it.each([
    ["Total Policies", "policies", "ALL"],
    ["Active Policies", "policies", "ACTIVE"],
    ["Total Claims", "claims", "ALL"],
    ["Pending Claims", "claims", "PENDING"],
  ] as const)(
    "navigates correctly when clicking %s",
    async (title, page, status) => {
      await renderLoadedDashboard();

      fireEvent.click(getSummaryCard(title));

      expect(mockNavigate).toHaveBeenCalledTimes(1);

      expect(mockNavigate).toHaveBeenCalledWith(page, status);
    },
  );

  // =====================================
  // STATUS OVERVIEW
  // =====================================

  // 35–39
  it.each([
    ["Expired Policies", "1"],
    ["Cancelled Policies", "1"],
    ["Approved Claims", "3"],
    ["Rejected Claims", "2"],
    ["Pending Claims", "2"],
  ] as const)(
    "displays the correct status overview count for %s",
    async (label, count) => {
      await renderLoadedDashboard();

      const button = getStatusOverviewButton(label);

      expect(button.querySelector("strong")?.textContent).toBe(count);
    },
  );

  // 40–44
  it.each([
    ["Expired Policies", "policies", "EXPIRED"],
    ["Cancelled Policies", "policies", "CANCELLED"],
    ["Approved Claims", "claims", "APPROVED"],
    ["Rejected Claims", "claims", "REJECTED"],
    ["Pending Claims", "claims", "PENDING"],
  ] as const)(
    "navigates correctly from the %s overview",
    async (label, page, status) => {
      await renderLoadedDashboard();

      fireEvent.click(getStatusOverviewButton(label));

      expect(mockNavigate).toHaveBeenCalledTimes(1);

      expect(mockNavigate).toHaveBeenCalledWith(page, status);
    },
  );

  // =====================================
  // FINANCIAL ANALYTICS
  // =====================================

  // 45
  it("calculates total policy premiums", async () => {
    await renderLoadedDashboard();

    expect(getFinancialValue("Total Policy Premiums")).toBe("$11,000.00");
  });

  // 46
  it("displays the total claimed amount from the backend", async () => {
    await renderLoadedDashboard();

    expect(getFinancialValue("Total Claimed Amount")).toBe("$14,050.00");
  });

  // 47
  it("uses the backend summary instead of the local claim sum", async () => {
    mockFetch.mockResolvedValueOnce(
      createSummaryResponse({
        ...mockSummary,
        totalClaimAmount: 99999.99,
      }),
    );

    await renderLoadedDashboard();

    expect(getFinancialValue("Total Claimed Amount")).toBe("$99,999.99");
  });

  // 48
  it("calculates the approval rate from resolved claims", async () => {
    await renderLoadedDashboard();

    expect(getFinancialValue("Claim Approval Rate")).toBe("60.0%");

    expect(getFinancialPanel("Claim Approval Rate")).toHaveTextContent(
      "Approved out of resolved claims",
    );
  });

  // 49
  it("returns a zero approval rate when all claims are pending", async () => {
    mockGetAllClaims.mockResolvedValue([
      createMockClaim(1, {
        status: "PENDING",
      }),
      createMockClaim(2, {
        status: "PENDING",
      }),
    ]);

    await renderLoadedDashboard();

    expect(getFinancialValue("Claim Approval Rate")).toBe("0.0%");
  });

  // 50
  it("returns a 100 percent approval rate when all resolved claims are approved", async () => {
    mockGetAllClaims.mockResolvedValue([
      createMockClaim(1, {
        status: "APPROVED",
      }),
      createMockClaim(2, {
        status: "APPROVED",
      }),
      createMockClaim(3, {
        status: "PENDING",
      }),
    ]);

    await renderLoadedDashboard();

    expect(getFinancialValue("Claim Approval Rate")).toBe("100.0%");
  });

  // 51
  it("displays zero financial values for an empty dataset", async () => {
    mockGetAllPolicies.mockResolvedValue([]);
    mockGetAllClaims.mockResolvedValue([]);

    mockFetch.mockResolvedValueOnce(createSummaryResponse(emptySummary));

    await renderLoadedDashboard();

    expect(getFinancialValue("Total Policy Premiums")).toBe("$0.00");

    expect(getFinancialValue("Total Claimed Amount")).toBe("$0.00");

    expect(getFinancialValue("Claim Approval Rate")).toBe("0.0%");

    [
      "Total Policies",
      "Active Policies",
      "Total Claims",
      "Pending Claims",
    ].forEach((title) => {
      expect(getSummaryCardValue(title)).toBe("0");
    });
  });

  // =====================================
  // STATUS CHARTS
  // =====================================

  // 52–54
  it.each([
    ["ACTIVE", "3 (50.0%)"],
    ["EXPIRED", "1 (16.7%)"],
    ["CANCELLED", "1 (16.7%)"],
  ] as const)(
    "calculates the correct policy percentage for %s",
    async (status, expected) => {
      await renderLoadedDashboard();

      const row = getStatusChartRow("Policies by Status", status);

      expect(row.querySelector("strong")).toHaveTextContent(expected);
    },
  );

  // 55–57
  it.each([
    ["PENDING", "2 (28.6%)"],
    ["APPROVED", "3 (42.9%)"],
    ["REJECTED", "2 (28.6%)"],
  ] as const)(
    "calculates the correct claim percentage for %s",
    async (status, expected) => {
      await renderLoadedDashboard();

      const row = getStatusChartRow("Claims by Status", status);

      expect(row.querySelector("strong")).toHaveTextContent(expected);
    },
  );

  // 58
  it("renders the correct status bar widths and classes", async () => {
    await renderLoadedDashboard();

    const activeBar = getStatusChartRow(
      "Policies by Status",
      "ACTIVE",
    ).querySelector(".analytics-fill");

    expect(activeBar).toHaveClass("active");

    expect(activeBar).toHaveStyle({
      width: "50%",
    });

    const approvedBar = getStatusChartRow(
      "Claims by Status",
      "APPROVED",
    ).querySelector<HTMLElement>(".analytics-fill");

    expect(approvedBar).toHaveClass("approved");

    expect(parseFloat(approvedBar?.style.width ?? "")).toBeCloseTo(
      (3 / 7) * 100,
    );
  });

  // 59
  it("navigates from policy status chart rows", async () => {
    await renderLoadedDashboard();

    ["ACTIVE", "EXPIRED", "CANCELLED"].forEach((status) => {
      fireEvent.click(getStatusChartRow("Policies by Status", status));

      expect(mockNavigate).toHaveBeenLastCalledWith("policies", status);
    });

    expect(mockNavigate).toHaveBeenCalledTimes(3);
  });

  // 60
  it("navigates from claim status chart rows", async () => {
    await renderLoadedDashboard();

    ["PENDING", "APPROVED", "REJECTED"].forEach((status) => {
      fireEvent.click(getStatusChartRow("Claims by Status", status));

      expect(mockNavigate).toHaveBeenLastCalledWith("claims", status);
    });

    expect(mockNavigate).toHaveBeenCalledTimes(3);
  });

  // 61
  it("handles empty datasets and case-insensitive statuses", async () => {
    mockGetAllPolicies.mockResolvedValue([]);

    mockGetAllClaims.mockResolvedValue([
      createMockClaim(1, {
        status: "approved" as Claim["status"],
      }),
      createMockClaim(2, {
        status: "Approved" as Claim["status"],
      }),
      createMockClaim(3, {
        status: "rejected" as Claim["status"],
      }),
    ]);

    await renderLoadedDashboard();

    expect(
      getStatusChartRow("Policies by Status", "ACTIVE").querySelector("strong"),
    ).toHaveTextContent("0 (0.0%)");

    expect(
      getStatusChartRow("Claims by Status", "APPROVED").querySelector("strong"),
    ).toHaveTextContent("2 (66.7%)");

    expect(
      getStatusChartRow("Claims by Status", "REJECTED").querySelector("strong"),
    ).toHaveTextContent("1 (33.3%)");
  });

  // =====================================
  // MONTHLY CLAIMS TREND
  // =====================================

  // 62
  it("renders the monthly claims trend heading and subtitle", async () => {
    await renderLoadedDashboard();

    expect(
      screen.getByRole("heading", {
        name: "Monthly Claims Trend",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Number of claims submitted each month"),
    ).toBeInTheDocument();
  });

  // 63
  it("defaults to the last six months", async () => {
    await renderLoadedDashboard();

    expect(
      screen.getByRole("combobox", {
        name: "Monthly claims date range",
      }),
    ).toHaveValue("6");

    expect(getMonthBars()).toHaveLength(6);
  });

  // 64
  it("renders all date range options", async () => {
    await renderLoadedDashboard();

    const select = screen.getByRole("combobox", {
      name: "Monthly claims date range",
    });

    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => (option as HTMLOptionElement).value),
    ).toEqual(["3", "6", "12", "all"]);
  });

  // 65
  it("displays monthly claim counts chronologically", async () => {
    await renderLoadedDashboard();

    expect(getMonthTitles()).toEqual([
      "Jun 26: 1 claims",
      "Jul 26: 0 claims",
      "Aug 26: 1 claims",
      "Sep 26: 1 claims",
      "Oct 26: 1 claims",
      "Nov 26: 2 claims",
    ]);
  });

  // 66
  it("includes months with no claims", async () => {
    await renderLoadedDashboard();

    expect(screen.getByTitle("Jul 26: 0 claims")).toBeInTheDocument();
  });

  // 67
  it("displays the last three months", async () => {
    await renderLoadedDashboard();

    changeDateRange("3");

    expect(getMonthTitles()).toEqual([
      "Sep 26: 1 claims",
      "Oct 26: 1 claims",
      "Nov 26: 2 claims",
    ]);
  });

  // 68
  it("displays the last twelve months", async () => {
    await renderLoadedDashboard();

    changeDateRange("12");

    expect(getMonthBars()).toHaveLength(12);

    expect(getMonthTitles()[0]).toBe("Dec 25: 0 claims");

    expect(getMonthTitles().at(-1)).toBe("Nov 26: 2 claims");
  });

  // 69
  it("displays all available months starting with the earliest claim", async () => {
    await renderLoadedDashboard();

    changeDateRange("all");

    expect(getMonthBars()).toHaveLength(7);

    expect(getMonthTitles()[0]).toBe("May 26: 1 claims");

    expect(getMonthTitles().at(-1)).toBe("Nov 26: 2 claims");
  });

  // 70
  it("limits the all-available range to sixty months", async () => {
    mockGetAllClaims.mockResolvedValue([
      createMockClaim(1, {
        claimDate: "2010-01-01",
      }),
      createMockClaim(2, {
        claimDate: "2026-11-01",
      }),
    ]);

    await renderLoadedDashboard();

    changeDateRange("all");

    expect(getMonthBars()).toHaveLength(60);

    expect(getMonthTitles()[0]).toBe("Dec 21: 0 claims");

    expect(getMonthTitles().at(-1)).toBe("Nov 26: 1 claims");
  });

  // 71
  it("defaults to six empty months when all available is selected without claims", async () => {
    mockGetAllClaims.mockResolvedValue([]);

    await renderLoadedDashboard();

    changeDateRange("all");

    expect(getMonthBars()).toHaveLength(6);

    getMonthTitles().forEach((title) => {
      expect(title).toContain(": 0 claims");
    });
  });

  // 72
  it("ignores invalid claim dates in monthly calculations", async () => {
    mockGetAllClaims.mockResolvedValue([
      createMockClaim(1, {
        claimDate: "invalid-date",
      }),
      createMockClaim(2, {
        claimDate: "2026-11-10",
      }),
    ]);

    await renderLoadedDashboard();

    expect(screen.getByTitle("Nov 26: 1 claims")).toBeInTheDocument();

    changeDateRange("all");

    expect(getMonthBars()).toHaveLength(1);
  });

  // 73 — CORRECTED MONTHLY BAR SELECTORS
  it("scales the monthly bar heights according to claim counts", async () => {
    await renderLoadedDashboard();

    const novemberBar = screen
      .getByTitle("Nov 26: 2 claims")
      .querySelector(":scope > div > div");

    const octoberBar = screen
      .getByTitle("Oct 26: 1 claims")
      .querySelector(":scope > div > div");

    const julyBar = screen
      .getByTitle("Jul 26: 0 claims")
      .querySelector(":scope > div > div");

    expect(novemberBar).toBeInTheDocument();
    expect(octoberBar).toBeInTheDocument();
    expect(julyBar).toBeInTheDocument();

    expect(novemberBar).toHaveStyle({
      height: "100%",
      minHeight: "4px",
    });

    expect(octoberBar).toHaveStyle({
      height: "50%",
      minHeight: "4px",
    });

    expect(julyBar).toHaveStyle({
      height: "0%",
      minHeight: "0px",
    });
  });

  // 74
  it("changes the date range without requesting backend data again", async () => {
    await renderLoadedDashboard();

    changeDateRange("3");
    changeDateRange("12");
    changeDateRange("all");
    changeDateRange("6");

    expect(getMonthBars()).toHaveLength(6);

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // =====================================
  // RECENT CLAIMS
  // =====================================

  // 75
  it("renders the recent claims heading and table", async () => {
    await renderLoadedDashboard();

    const section = getSection("Recent Claims");

    expect(within(section).getByRole("table")).toBeInTheDocument();
  });

  // 76
  it("renders the recent claims table headers", async () => {
    await renderLoadedDashboard();

    const headers = within(getSection("Recent Claims")).getAllByRole(
      "columnheader",
    );

    expect(headers.map((header) => header.textContent)).toEqual([
      "Claim Number",
      "Date",
      "Amount",
      "Status",
    ]);
  });

  // 77
  it("limits recent claims to five records", async () => {
    await renderLoadedDashboard();

    expect(getRecentClaimRows()).toHaveLength(5);

    expect(screen.queryByText("CLM-006")).not.toBeInTheDocument();

    expect(screen.queryByText("CLM-007")).not.toBeInTheDocument();
  });

  // 78
  it("sorts recent claims by newest date first", async () => {
    await renderLoadedDashboard();

    expect(getRecentClaimNumbers()).toEqual([
      "CLM-002",
      "CLM-001",
      "CLM-003",
      "CLM-004",
      "CLM-005",
    ]);
  });

  // 79
  it("sorts claims with identical dates by descending ID", async () => {
    mockGetAllClaims.mockResolvedValue([
      createMockClaim(1, {
        claimDate: "2026-11-10",
      }),
      createMockClaim(3, {
        claimDate: "2026-11-10",
      }),
      createMockClaim(2, {
        claimDate: "2026-11-10",
      }),
    ]);

    await renderLoadedDashboard();

    expect(getRecentClaimNumbers()).toEqual(["CLM-003", "CLM-002", "CLM-001"]);
  });

  // 80
  it("uses descending IDs when claim dates cannot be compared", async () => {
    mockGetAllClaims.mockResolvedValue([
      createMockClaim(1, {
        claimDate: "invalid-date",
      }),
      createMockClaim(2, {
        claimDate: "invalid-date",
      }),
    ]);

    await renderLoadedDashboard();

    expect(getRecentClaimNumbers()).toEqual(["CLM-002", "CLM-001"]);
  });

  // 81
  it("formats recent claim amounts and displays status classes", async () => {
    await renderLoadedDashboard();

    const row = within(getSection("Recent Claims"))
      .getByText("CLM-002")
      .closest("tr")!;

    expect(row).toHaveTextContent("2026-11-15");

    expect(row).toHaveTextContent("$2,500.00");

    expect(within(row).getByText("APPROVED")).toHaveClass(
      "claim-status",
      "approved",
    );
  });

  // 82
  it("displays an empty state when there are no recent claims", async () => {
    mockGetAllClaims.mockResolvedValue([]);

    await renderLoadedDashboard();

    const section = within(getSection("Recent Claims"));

    expect(section.getByText("No claims yet.")).toBeInTheDocument();

    expect(section.queryByRole("table")).not.toBeInTheDocument();
  });

  // 83
  it("navigates to the claims page when View All is clicked", async () => {
    await renderLoadedDashboard();

    fireEvent.click(
      within(getSection("Recent Claims")).getByRole("button", {
        name: "View All",
      }),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    expect(mockNavigate).toHaveBeenCalledWith("claims");
  });

  // =====================================
  // REFRESH FUNCTIONALITY
  // =====================================

  // 84
  it("refreshes all dashboard data and displays updated values", async () => {
    await renderLoadedDashboard();

    const updatedPolicies = [
      ...mockPolicies,
      createMockPolicy(7, {
        premiumAmount: 500,
        status: "ACTIVE",
      }),
    ];

    const updatedClaims = [
      ...mockClaims,
      createMockClaim(8, {
        claimAmount: 1000,
        claimDate: "2026-11-18",
        status: "PENDING",
      }),
    ];

    mockGetAllPolicies.mockResolvedValueOnce(updatedPolicies);

    mockGetAllClaims.mockResolvedValueOnce(updatedClaims);

    mockFetch.mockResolvedValueOnce(
      createSummaryResponse({
        totalPolicies: 7,
        activePolicies: 4,
        totalClaims: 8,
        pendingClaims: 3,
        totalClaimAmount: 15050,
      }),
    );

    clickButton("Refresh");

    await waitFor(() => {
      expect(getSummaryCardValue("Total Policies")).toBe("7");

      expect(getSummaryCardValue("Active Policies")).toBe("4");

      expect(getSummaryCardValue("Total Claims")).toBe("8");

      expect(getSummaryCardValue("Pending Claims")).toBe("3");

      expect(getFinancialValue("Total Policy Premiums")).toBe("$11,500.00");

      expect(getFinancialValue("Total Claimed Amount")).toBe("$15,050.00");

      expect(getRecentClaimNumbers()[0]).toBe("CLM-008");
    });

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(2);

    expect(mockGetAllClaims).toHaveBeenCalledTimes(2);

    expect(mockFetch).toHaveBeenCalledTimes(2);

    expect(mockGetToken).toHaveBeenCalledTimes(2);
  });

  // 85
  it("retries failed requests and recovers the dashboard", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network unavailable"));

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );

    expect(
      screen.getByRole("button", {
        name: "Try Again",
      }),
    ).toBeEnabled();

    clickButton("Try Again");

    expect(
      await screen.findByRole("heading", {
        name: "Insurance Dashboard",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(2);

    expect(mockGetAllClaims).toHaveBeenCalledTimes(2);

    expect(mockFetch).toHaveBeenCalledTimes(2);

    expect(getSummaryCardValue("Total Policies")).toBe("6");
  });
});
