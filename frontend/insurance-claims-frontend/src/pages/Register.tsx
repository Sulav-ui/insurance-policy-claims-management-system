import { useState, type FormEvent } from "react";

import { register } from "../services/authService";

import "../styles/register.css";

interface RegisterProps {
  onBackToLogin: () => void;
}

export default function Register({ onBackToLogin }: RegisterProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setError("");

    const name = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register({
        fullName: name,
        email: normalizedEmail,
        password,
      });

      setSuccess(true);

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-card">
        {/* HEADER */}
        <div className="register-header">
          <div className="register-icon" aria-hidden="true">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          <h1>Create Account</h1>

          <p className="register-subtitle">
            Join Insurance Management to view policies and claims
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <p className="register-error" role="alert">
            {error}
          </p>
        )}

        {/* SUCCESS */}
        {success ? (
          <div className="register-success-section">
            <div className="register-success" role="status">
              Account created successfully! You can now sign in.
            </div>

            <button
              type="button"
              className="register-button"
              onClick={onBackToLogin}
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form className="register-form" onSubmit={handleSubmit}>
            {/* FULL NAME */}
            <div className="register-field">
              <label htmlFor="register-fullname">Full Name</label>

              <input
                id="register-fullname"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                disabled={loading}
              />
            </div>

            {/* EMAIL */}
            <div className="register-field">
              <label htmlFor="register-email">Email Address</label>

              <input
                id="register-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            {/* PASSWORD */}
            <div className="register-field">
              <label htmlFor="register-password">Password</label>

              <input
                id="register-password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={loading}
              />
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="register-field">
              <label htmlFor="register-confirm-password">
                Confirm Password
              </label>

              <input
                id="register-confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
              />
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        {/* LOGIN NAVIGATION */}
        <div className="register-login-section">
          <div className="register-divider">
            <span>OR</span>
          </div>

          <p className="register-login-text">Already have an account?</p>

          <button
            type="button"
            className="register-login-button"
            onClick={onBackToLogin}
            disabled={loading}
          >
            Sign In
          </button>
        </div>

        {/* FOOTER */}
        <p className="register-footer">
          Insurance Policy & Claims Management System
        </p>
      </div>
    </div>
  );
}
