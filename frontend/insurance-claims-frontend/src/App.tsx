import { useEffect, useState } from "react";

import Dashboard from "./pages/Dashboard";
import Policies from "./pages/Policies";
import Claims from "./pages/Claims";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Sidebar from "./components/Sidebar";

import { getAuth, logout } from "./services/authService";

import "./styles/management.css";
import "./styles/dashboard.css";

// =====================================
// TYPES
// =====================================

type Page = "dashboard" | "policies" | "claims";
type AuthPage = "login" | "register";

// =====================================
// APP COMPONENT
// =====================================

function App() {
  // Authentication state
  const [authenticated, setAuthenticated] = useState(() => getAuth() !== null);

  // Login / Register page state
  const [authPage, setAuthPage] = useState<AuthPage>("login");

  // Current application page
  const [activePage, setActivePage] = useState<Page>("dashboard");

  // Dashboard navigation filters
  const [policyFilter, setPolicyFilter] = useState("ALL");

  const [claimFilter, setClaimFilter] = useState("ALL");

  // JWT session expiration message
  const [sessionExpired, setSessionExpired] = useState(false);

  // =====================================
  // AUTOMATIC JWT SESSION EXPIRATION
  // =====================================

  useEffect(() => {
    function handleSessionExpired() {
      // Remove expired authentication
      logout();

      // Return to Login
      setAuthenticated(false);
      setAuthPage("login");

      // Reset navigation
      setActivePage("dashboard");
      setPolicyFilter("ALL");
      setClaimFilter("ALL");

      // Show expiration notification
      setSessionExpired(true);
    }

    window.addEventListener("auth:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  // =====================================
  // LOGIN SUCCESS
  // =====================================

  function handleLoginSuccess() {
    setAuthenticated(true);
    setAuthPage("login");
    setSessionExpired(false);

    setActivePage("dashboard");
    setPolicyFilter("ALL");
    setClaimFilter("ALL");
  }

  // =====================================
  // MANUAL LOGOUT
  // =====================================

  function handleLogout() {
    logout();

    setAuthenticated(false);
    setAuthPage("login");
    setSessionExpired(false);

    setActivePage("dashboard");
    setPolicyFilter("ALL");
    setClaimFilter("ALL");
  }

  // =====================================
  // DASHBOARD NAVIGATION
  // =====================================

  function handleDashboardNavigate(
    page: "policies" | "claims",
    status = "ALL",
  ) {
    if (page === "policies") {
      setPolicyFilter(status);
    } else {
      setClaimFilter(status);
    }

    setActivePage(page);
  }

  // =====================================
  // SIDEBAR NAVIGATION
  // =====================================

  function handleSidebarNavigate(page: Page) {
    setPolicyFilter("ALL");
    setClaimFilter("ALL");

    setActivePage(page);
  }

  // =====================================
  // LOGIN / REGISTER NAVIGATION
  // =====================================

  function handleShowRegister() {
    setSessionExpired(false);
    setAuthPage("register");
  }

  function handleBackToLogin() {
    setAuthPage("login");
  }

  // =====================================
  // UNAUTHENTICATED ROUTES
  // =====================================

  if (!authenticated) {
    // REGISTER PAGE
    if (authPage === "register") {
      return <Register onBackToLogin={handleBackToLogin} />;
    }

    // LOGIN PAGE
    return (
      <div>
        {/* SESSION EXPIRATION MESSAGE */}
        <Login
          onLoginSuccess={handleLoginSuccess}
          sessionExpired={sessionExpired}
        />

        {/* REGISTER NAVIGATION */}
        <div
          style={{
            textAlign: "center",
            marginTop: "16px",
            marginBottom: "24px",
          }}
        >
          <p>Don't have an account?</p>

          <button
            type="button"
            className="btn-refresh"
            onClick={handleShowRegister}
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  // =====================================
  // AUTHENTICATED APPLICATION
  // =====================================

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <Sidebar activePage={activePage} onNavigate={handleSidebarNavigate} />

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* AUTHENTICATION TOOLBAR */}
        <div className="auth-toolbar">
          <span className="auth-user">{getAuth()?.email}</span>

          <button
            type="button"
            className="auth-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        {/* DASHBOARD */}
        {activePage === "dashboard" && (
          <Dashboard onNavigate={handleDashboardNavigate} />
        )}

        {/* POLICIES */}
        {activePage === "policies" && (
          <Policies initialStatusFilter={policyFilter} />
        )}

        {/* CLAIMS */}
        {activePage === "claims" && (
          <Claims initialStatusFilter={claimFilter} />
        )}
      </main>
    </div>
  );
}

export default App;
