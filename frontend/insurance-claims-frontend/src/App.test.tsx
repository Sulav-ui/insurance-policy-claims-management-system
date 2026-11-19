import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { act, fireEvent, render, screen, within } from "@testing-library/react";

import App from "./App";

import { getAuth, logout } from "./services/authService";

// =====================================
// TYPES
// =====================================

type Page = "dashboard" | "policies" | "claims";

type DashboardProps = {
  onNavigate: (page: "policies" | "claims", status?: string) => void;
};

type SidebarProps = {
  activePage: Page;
  onNavigate: (page: Page) => void;
};

type LoginProps = {
  onLoginSuccess: () => void;
  sessionExpired?: boolean;
};

type RegisterProps = {
  onBackToLogin: () => void;
};

type FilterPageProps = {
  initialStatusFilter?: string;
};

// =====================================
// MOCK AUTHENTICATION SERVICE
// =====================================

vi.mock("./services/authService", () => ({
  getAuth: vi.fn(),
  logout: vi.fn(),
}));

const mockGetAuth = vi.mocked(getAuth);
const mockLogout = vi.mocked(logout);

// =====================================
// MOCK LOGIN PAGE
// =====================================

vi.mock("./pages/Login", () => ({
  default: ({ onLoginSuccess, sessionExpired }: LoginProps) => (
    <div data-testid="login-page">
      <h1>Login Page</h1>

      {sessionExpired && (
        <p role="alert">Your session has expired. Please log in again.</p>
      )}

      <button type="button" onClick={onLoginSuccess}>
        Mock Sign In
      </button>
    </div>
  ),
}));

// =====================================
// MOCK REGISTER PAGE
// =====================================

vi.mock("./pages/Register", () => ({
  default: ({ onBackToLogin }: RegisterProps) => (
    <div data-testid="register-page">
      <h1>Register Page</h1>

      <button type="button" onClick={onBackToLogin}>
        Back to Login
      </button>
    </div>
  ),
}));

// =====================================
// MOCK SIDEBAR
// =====================================

vi.mock("./components/Sidebar", () => ({
  default: ({ activePage, onNavigate }: SidebarProps) => (
    <aside data-testid="sidebar">
      <nav aria-label="Sidebar Navigation">
        <button
          type="button"
          className={activePage === "dashboard" ? "active" : ""}
          onClick={() => onNavigate("dashboard")}
        >
          Dashboard
        </button>

        <button
          type="button"
          className={activePage === "policies" ? "active" : ""}
          onClick={() => onNavigate("policies")}
        >
          Policies
        </button>

        <button
          type="button"
          className={activePage === "claims" ? "active" : ""}
          onClick={() => onNavigate("claims")}
        >
          Claims
        </button>
      </nav>

      <span data-testid="active-page">{activePage}</span>
    </aside>
  ),
}));

// =====================================
// MOCK DASHBOARD PAGE
// =====================================

vi.mock("./pages/Dashboard", () => ({
  default: ({ onNavigate }: DashboardProps) => (
    <div data-testid="dashboard-page">
      <h1>Dashboard Page</h1>

      <button type="button" onClick={() => onNavigate("policies")}>
        Total Policies
      </button>

      <button type="button" onClick={() => onNavigate("policies", "ACTIVE")}>
        Active Policies
      </button>

      <button type="button" onClick={() => onNavigate("policies", "EXPIRED")}>
        Expired Policies
      </button>

      <button type="button" onClick={() => onNavigate("policies", "CANCELLED")}>
        Cancelled Policies
      </button>

      <button type="button" onClick={() => onNavigate("policies", "INACTIVE")}>
        Inactive Policies
      </button>

      <button type="button" onClick={() => onNavigate("claims")}>
        Total Claims
      </button>

      <button type="button" onClick={() => onNavigate("claims", "PENDING")}>
        Pending Claims
      </button>

      <button type="button" onClick={() => onNavigate("claims", "APPROVED")}>
        Approved Claims
      </button>

      <button type="button" onClick={() => onNavigate("claims", "REJECTED")}>
        Rejected Claims
      </button>

      <button type="button" onClick={() => onNavigate("claims", "ALL")}>
        View All Claims
      </button>
    </div>
  ),
}));

// =====================================
// MOCK POLICIES PAGE
// =====================================

vi.mock("./pages/Policies", () => ({
  default: ({ initialStatusFilter }: FilterPageProps) => (
    <div data-testid="policies-page">
      <h1>Policies Page</h1>

      <span data-testid="policy-filter">{initialStatusFilter}</span>
    </div>
  ),
}));

// =====================================
// MOCK CLAIMS PAGE
// =====================================

vi.mock("./pages/Claims", () => ({
  default: ({ initialStatusFilter }: FilterPageProps) => (
    <div data-testid="claims-page">
      <h1>Claims Page</h1>

      <span data-testid="claim-filter">{initialStatusFilter}</span>
    </div>
  ),
}));

// =====================================
// TEST AUTHENTICATION DATA
// =====================================

const mockAdmin: NonNullable<ReturnType<typeof getAuth>> = {
  token: "admin-jwt-token",
  tokenType: "Bearer",
  role: "ADMIN",
  email: "admin@example.com",
};

const mockUser: NonNullable<ReturnType<typeof getAuth>> = {
  token: "user-jwt-token",
  tokenType: "Bearer",
  role: "USER",
  email: "user@example.com",
};

// =====================================
// TEST HELPERS
// =====================================

function renderUnauthenticatedApp() {
  mockGetAuth.mockReturnValue(null);

  return render(<App />);
}

function renderAuthenticatedApp(auth = mockAdmin) {
  mockGetAuth.mockReturnValue(auth);

  return render(<App />);
}

function clickButton(name: string) {
  fireEvent.click(
    screen.getByRole("button", {
      name,
    }),
  );
}

function navigateSidebar(page: "Dashboard" | "Policies" | "Claims") {
  const sidebar = within(screen.getByTestId("sidebar"));

  fireEvent.click(
    sidebar.getByRole("button", {
      name: page,
    }),
  );
}

function navigateDashboard(name: string) {
  const dashboard = within(screen.getByTestId("dashboard-page"));

  fireEvent.click(
    dashboard.getByRole("button", {
      name,
    }),
  );
}

function loginSuccessfully(auth = mockAdmin) {
  mockGetAuth.mockReturnValue(auth);

  clickButton("Mock Sign In");
}

function expireSession() {
  act(() => {
    window.dispatchEvent(new Event("auth:session-expired"));
  });
}

function expectDashboardPage() {
  expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();

  expect(screen.getByTestId("active-page")).toHaveTextContent(/^dashboard$/);
}

function expectLoginPage() {
  expect(screen.getByTestId("login-page")).toBeInTheDocument();

  expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
}

function expectPolicyFilter(expected: string) {
  expect(screen.getByTestId("policies-page")).toBeInTheDocument();

  expect(screen.getByTestId("policy-filter").textContent).toBe(expected);
}

function expectClaimFilter(expected: string) {
  expect(screen.getByTestId("claims-page")).toBeInTheDocument();

  expect(screen.getByTestId("claim-filter").textContent).toBe(expected);
}

// =====================================
// APP COMPONENT TESTS
// =====================================

describe("App Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockGetAuth.mockReturnValue(null);

    mockLogout.mockImplementation(() => {
      mockGetAuth.mockReturnValue(null);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =====================================
  // INITIAL AUTHENTICATION
  // =====================================

  // 1
  it("checks existing authentication on mount", () => {
    renderUnauthenticatedApp();

    expect(mockGetAuth).toHaveBeenCalled();
  });

  // 2
  it("renders the login page when the user is unauthenticated", () => {
    renderUnauthenticatedApp();

    expectLoginPage();
  });

  // 3
  it("does not render protected pages without authentication", () => {
    renderUnauthenticatedApp();

    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();

    expect(screen.queryByTestId("policies-page")).not.toBeInTheDocument();

    expect(screen.queryByTestId("claims-page")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Logout",
      }),
    ).not.toBeInTheDocument();
  });

  // 4
  it("renders the dashboard for an authenticated administrator", () => {
    renderAuthenticatedApp(mockAdmin);

    expectDashboardPage();

    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  // 5
  it("renders the dashboard for an authenticated regular user", () => {
    renderAuthenticatedApp(mockUser);

    expectDashboardPage();

    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  // 6
  it("does not display a session expiration warning on initial login", () => {
    renderUnauthenticatedApp();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // =====================================
  // LOGIN AND REGISTRATION NAVIGATION
  // =====================================

  // 7
  it("renders the account registration prompt", () => {
    renderUnauthenticatedApp();

    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  // 8
  it("renders the create account button", () => {
    renderUnauthenticatedApp();

    const button = screen.getByRole("button", {
      name: "Create Account",
    });

    expect(button).toBeEnabled();

    expect(button).toHaveClass("btn-refresh");
  });

  // 9
  it("navigates from login to registration", () => {
    renderUnauthenticatedApp();

    clickButton("Create Account");

    expect(screen.getByTestId("register-page")).toBeInTheDocument();

    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  // 10
  it("navigates from registration back to login", () => {
    renderUnauthenticatedApp();

    clickButton("Create Account");
    clickButton("Back to Login");

    expectLoginPage();

    expect(screen.queryByTestId("register-page")).not.toBeInTheDocument();
  });

  // 11
  it("supports repeated login and registration navigation", () => {
    renderUnauthenticatedApp();

    for (let index = 0; index < 3; index++) {
      clickButton("Create Account");

      expect(screen.getByTestId("register-page")).toBeInTheDocument();

      clickButton("Back to Login");

      expectLoginPage();
    }
  });

  // 12
  it("renders the authenticated dashboard after successful login", () => {
    renderUnauthenticatedApp();

    loginSuccessfully();

    expectDashboardPage();

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  // 13
  it("removes unauthenticated controls after successful login", () => {
    renderUnauthenticatedApp();

    loginSuccessfully();

    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();

    expect(screen.queryByTestId("register-page")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Create Account",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Don't have an account?"),
    ).not.toBeInTheDocument();
  });

  // 14
  it("displays the correct user email after successful login", () => {
    renderUnauthenticatedApp();

    loginSuccessfully(mockUser);

    expect(screen.getByText("user@example.com")).toBeInTheDocument();

    expectDashboardPage();
  });

  // =====================================
  // AUTHENTICATED APPLICATION LAYOUT
  // =====================================

  // 15
  it("renders the authenticated application layout", () => {
    const { container } = renderAuthenticatedApp();

    expect(container.querySelector(".app-layout")).toBeInTheDocument();
  });

  // 16
  it("renders the main content area", () => {
    renderAuthenticatedApp();

    expect(screen.getByRole("main")).toHaveClass("main-content");
  });

  // 17
  it("renders the sidebar within the application layout", () => {
    const { container } = renderAuthenticatedApp();

    const layout = container.querySelector(".app-layout");

    expect(layout).toContainElement(screen.getByTestId("sidebar"));
  });

  // 18
  it("renders the authentication toolbar", () => {
    const { container } = renderAuthenticatedApp();

    expect(container.querySelector(".auth-toolbar")).toBeInTheDocument();
  });

  // 19
  it("displays the authenticated administrator email", () => {
    renderAuthenticatedApp();

    expect(screen.getByText("admin@example.com")).toHaveClass("auth-user");
  });

  // 20
  it("renders the logout button in the authentication toolbar", () => {
    const { container } = renderAuthenticatedApp();

    const button = screen.getByRole("button", {
      name: "Logout",
    });

    expect(button).toBeEnabled();

    expect(button).toHaveClass("auth-logout-button");

    expect(container.querySelector(".auth-toolbar")).toContainElement(button);
  });

  // =====================================
  // SIDEBAR NAVIGATION
  // =====================================

  // 21
  it("sets the dashboard as the default active page", () => {
    renderAuthenticatedApp();

    expectDashboardPage();

    expect(
      within(screen.getByTestId("sidebar")).getByRole("button", {
        name: "Dashboard",
      }),
    ).toHaveClass("active");
  });

  // 22
  it("navigates to the policies page from the sidebar", () => {
    renderAuthenticatedApp();

    navigateSidebar("Policies");

    expectPolicyFilter("ALL");

    expect(screen.getByTestId("active-page")).toHaveTextContent(/^policies$/);

    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  // 23
  it("navigates to the claims page from the sidebar", () => {
    renderAuthenticatedApp();

    navigateSidebar("Claims");

    expectClaimFilter("ALL");

    expect(screen.getByTestId("active-page")).toHaveTextContent(/^claims$/);

    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  // 24
  it("returns to the dashboard from another page", () => {
    renderAuthenticatedApp();

    navigateSidebar("Policies");

    navigateSidebar("Dashboard");

    expectDashboardPage();

    expect(screen.queryByTestId("policies-page")).not.toBeInTheDocument();

    expect(screen.queryByTestId("claims-page")).not.toBeInTheDocument();
  });

  // 25
  it("renders only one application page at a time", () => {
    renderAuthenticatedApp();

    expectDashboardPage();

    navigateSidebar("Policies");

    expect(screen.getByTestId("policies-page")).toBeInTheDocument();

    expect(screen.queryByTestId("claims-page")).not.toBeInTheDocument();

    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();

    navigateSidebar("Claims");

    expect(screen.getByTestId("claims-page")).toBeInTheDocument();

    expect(screen.queryByTestId("policies-page")).not.toBeInTheDocument();

    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  // 26
  it("updates the active sidebar page after navigation", () => {
    renderAuthenticatedApp();

    const sidebar = within(screen.getByTestId("sidebar"));

    navigateSidebar("Policies");

    expect(
      sidebar.getByRole("button", {
        name: "Policies",
      }),
    ).toHaveClass("active");

    expect(
      sidebar.getByRole("button", {
        name: "Dashboard",
      }),
    ).not.toHaveClass("active");

    navigateSidebar("Claims");

    expect(
      sidebar.getByRole("button", {
        name: "Claims",
      }),
    ).toHaveClass("active");

    expect(
      sidebar.getByRole("button", {
        name: "Policies",
      }),
    ).not.toHaveClass("active");
  });

  // =====================================
  // DASHBOARD NAVIGATION AND FILTERS
  // =====================================

  // 27–31
  it.each([
    ["Total Policies", "ALL"],
    ["Active Policies", "ACTIVE"],
    ["Expired Policies", "EXPIRED"],
    ["Cancelled Policies", "CANCELLED"],
    ["Inactive Policies", "INACTIVE"],
  ] as const)(
    "navigates from %s with the correct policy filter",
    (buttonName, expectedFilter) => {
      renderAuthenticatedApp();

      navigateDashboard(buttonName);

      expectPolicyFilter(expectedFilter);

      expect(screen.getByTestId("active-page")).toHaveTextContent(/^policies$/);

      expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
    },
  );

  // 32–35
  it.each([
    ["Total Claims", "ALL"],
    ["Pending Claims", "PENDING"],
    ["Approved Claims", "APPROVED"],
    ["Rejected Claims", "REJECTED"],
  ] as const)(
    "navigates from %s with the correct claim filter",
    (buttonName, expectedFilter) => {
      renderAuthenticatedApp();

      navigateDashboard(buttonName);

      expectClaimFilter(expectedFilter);

      expect(screen.getByTestId("active-page")).toHaveTextContent(/^claims$/);

      expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
    },
  );

  // 36
  it("resets dashboard filters when navigating through the sidebar", () => {
    renderAuthenticatedApp();

    navigateDashboard("Active Policies");

    expectPolicyFilter("ACTIVE");

    navigateSidebar("Policies");

    expectPolicyFilter("ALL");

    navigateSidebar("Dashboard");

    navigateDashboard("Pending Claims");

    expectClaimFilter("PENDING");

    navigateSidebar("Claims");

    expectClaimFilter("ALL");

    navigateSidebar("Dashboard");

    navigateDashboard("View All Claims");

    expectClaimFilter("ALL");

    navigateSidebar("Policies");

    expectPolicyFilter("ALL");
  });

  // =====================================
  // MANUAL LOGOUT
  // =====================================

  // 37
  it("calls the authentication service when logging out", () => {
    renderAuthenticatedApp();

    clickButton("Logout");

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  // 38
  it("returns to the login page after manual logout", () => {
    renderAuthenticatedApp();

    clickButton("Logout");

    expectLoginPage();

    expect(
      screen.getByRole("button", {
        name: "Create Account",
      }),
    ).toBeInTheDocument();
  });

  // 39
  it("removes protected application content after logout", () => {
    const { container } = renderAuthenticatedApp();

    navigateSidebar("Policies");

    clickButton("Logout");

    expect(container.querySelector(".app-layout")).not.toBeInTheDocument();

    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();

    expect(screen.queryByTestId("policies-page")).not.toBeInTheDocument();

    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();

    expect(screen.queryByTestId("claims-page")).not.toBeInTheDocument();

    expect(screen.queryByText("admin@example.com")).not.toBeInTheDocument();
  });

  // 40
  it("does not display a session expiration warning after manual logout", () => {
    renderAuthenticatedApp();

    clickButton("Logout");

    expectLoginPage();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // 41
  it("resets navigation and filters after logout and reauthentication", () => {
    renderAuthenticatedApp();

    navigateDashboard("Approved Claims");

    expectClaimFilter("APPROVED");

    clickButton("Logout");

    expectLoginPage();

    loginSuccessfully();

    expectDashboardPage();

    navigateSidebar("Claims");

    expectClaimFilter("ALL");

    navigateSidebar("Policies");

    expectPolicyFilter("ALL");

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  // =====================================
  // AUTOMATIC JWT SESSION EXPIRATION
  // =====================================

  // 42
  it("calls logout when the JWT session expires", () => {
    renderAuthenticatedApp();

    expireSession();

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  // 43
  it("returns to the login page when the session expires", () => {
    renderAuthenticatedApp();

    expireSession();

    expectLoginPage();

    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Logout",
      }),
    ).not.toBeInTheDocument();
  });

  // 44
  it("displays a session expiration warning", () => {
    renderAuthenticatedApp();

    expireSession();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has expired. Please log in again.",
    );
  });

  // 45
  it("handles session expiration while viewing a filtered claims page", () => {
    renderAuthenticatedApp();

    navigateDashboard("Pending Claims");

    expectClaimFilter("PENDING");

    expireSession();

    expectLoginPage();

    expect(screen.queryByTestId("claims-page")).not.toBeInTheDocument();

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  // 46
  it("resets navigation and filters after session expiration and successful login", () => {
    renderAuthenticatedApp();

    navigateDashboard("Expired Policies");

    expectPolicyFilter("EXPIRED");

    expireSession();

    expectLoginPage();

    loginSuccessfully();

    expectDashboardPage();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    navigateSidebar("Policies");

    expectPolicyFilter("ALL");

    navigateSidebar("Claims");

    expectClaimFilter("ALL");

    clickButton("Logout");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // 47
  it("clears the expiration warning when navigating to registration", () => {
    renderAuthenticatedApp();

    expireSession();

    expect(screen.getByRole("alert")).toBeInTheDocument();

    clickButton("Create Account");

    expect(screen.getByTestId("register-page")).toBeInTheDocument();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    clickButton("Back to Login");

    expectLoginPage();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // 48
  it("returns to login if a session expiration event occurs during registration", () => {
    renderUnauthenticatedApp();

    clickButton("Create Account");

    expect(screen.getByTestId("register-page")).toBeInTheDocument();

    expireSession();

    expectLoginPage();

    expect(screen.queryByTestId("register-page")).not.toBeInTheDocument();

    expect(screen.getByRole("alert")).toBeInTheDocument();

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  // =====================================
  // EVENT LISTENER LIFECYCLE
  // =====================================

  // 49
  it("registers the session expiration event listener when mounted", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    renderAuthenticatedApp();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "auth:session-expired",
      expect.any(Function),
    );

    const authListeners = addEventListenerSpy.mock.calls.filter(
      ([eventName]) => eventName === "auth:session-expired",
    );

    expect(authListeners).toHaveLength(1);
  });

  // 50
  it("removes the session expiration listener when unmounted", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderAuthenticatedApp();

    const registeredListener = addEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === "auth:session-expired",
    )?.[1];

    expect(registeredListener).toEqual(expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "auth:session-expired",
      registeredListener,
    );

    expireSession();

    expect(mockLogout).not.toHaveBeenCalled();
  });
});
