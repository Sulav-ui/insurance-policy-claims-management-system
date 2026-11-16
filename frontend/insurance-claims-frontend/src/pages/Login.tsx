import { useState, type FormEvent } from "react";
import { login, saveAuth } from "../services/authService";
import "../styles/Login.css";

// =====================================
// LOGIN PROPS
// =====================================

interface LoginProps {
  onLoginSuccess: () => void;
  sessionExpired?: boolean;
}

// =====================================
// LOGIN COMPONENT
// =====================================

export default function Login({
  onLoginSuccess,
  sessionExpired = false,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================
  // HANDLE LOGIN
  // =====================================

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const auth = await login({
        email: email.trim(),
        password,
      });

      saveAuth(auth);
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in");
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // LOGIN UI
  // =====================================

  return (
    <div className="login-page">
      <div className="login-card">
        {/* LOGIN ICON */}
        <div className="login-icon">🛡️</div>

        {/* TITLE */}
        <h1>Insurance Management</h1>

        <p className="login-subtitle">Sign in to manage policies and claims</p>

        {/* SESSION EXPIRED NOTIFICATION */}
        {sessionExpired && (
          <div className="login-session-alert" role="alert">
            <span className="login-session-alert-icon" aria-hidden="true">
              ⚠
            </span>

            <div className="login-session-alert-content">
              <strong>Session expired</strong>

              <p>For your security, please sign in again to continue.</p>
            </div>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit}>
          {/* EMAIL */}
          <div className="login-field">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="username"
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="login-field">
            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {/* LOGIN ERROR */}
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          {/* SIGN IN BUTTON */}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* FOOTER */}
        <p className="login-footer">
          Insurance Policy & Claims Management System
        </p>
      </div>
    </div>
  );
}
