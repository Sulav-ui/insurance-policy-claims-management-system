import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Login from "./Login";
import { login, saveAuth } from "../services/authService";

// =====================================
// MOCK AUTH SERVICE
// =====================================

vi.mock("../services/authService", () => ({
  login: vi.fn(),
  saveAuth: vi.fn(),
}));

const mockLogin = vi.mocked(login);
const mockSaveAuth = vi.mocked(saveAuth);

describe("Login Component", () => {
  const onLoginSuccess = vi.fn();

  const mockAuth = {
    token: "mock-jwt-token",
    tokenType: "Bearer",
    role: "USER" as const,
    email: "user@example.com",
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  // =====================================
  // HELPER FUNCTION
  // =====================================

  async function fillLoginForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Email Address"), "user@example.com");

    await user.type(screen.getByLabelText("Password"), "Password123");
  }

  // =====================================
  // 1. RENDER LOGIN COMPONENT
  // =====================================

  it("should render the login form", () => {
    render(<Login onLoginSuccess={onLoginSuccess} />);

    expect(
      screen.getByRole("heading", {
        name: "Insurance Management",
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();

    expect(screen.getByLabelText("Password")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  // =====================================
  // 2. EMAIL INPUT
  // =====================================

  it("should accept email input", async () => {
    const user = userEvent.setup();

    render(<Login onLoginSuccess={onLoginSuccess} />);

    const emailInput = screen.getByLabelText("Email Address");

    await user.type(emailInput, "user@example.com");

    expect(emailInput).toHaveValue("user@example.com");
  });

  // =====================================
  // 3. PASSWORD INPUT
  // =====================================

  it("should accept and hide password input", async () => {
    const user = userEvent.setup();

    render(<Login onLoginSuccess={onLoginSuccess} />);

    const passwordInput = screen.getByLabelText("Password");

    await user.type(passwordInput, "Password123");

    expect(passwordInput).toHaveValue("Password123");
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  // =====================================
  // 4. EMPTY FORM VALIDATION
  // =====================================

  it("should prevent submission with empty fields", async () => {
    const user = userEvent.setup();

    render(<Login onLoginSuccess={onLoginSuccess} />);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByLabelText("Email Address")).toBeInvalid();
    expect(screen.getByLabelText("Password")).toBeInvalid();

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockSaveAuth).not.toHaveBeenCalled();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  // =====================================
  // 5. INVALID EMAIL VALIDATION
  // =====================================

  it("should prevent submission with invalid email", async () => {
    const user = userEvent.setup();

    render(<Login onLoginSuccess={onLoginSuccess} />);

    await user.type(screen.getByLabelText("Email Address"), "invalid-email");

    await user.type(screen.getByLabelText("Password"), "Password123");

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByLabelText("Email Address")).toBeInvalid();

    expect(mockLogin).not.toHaveBeenCalled();
  });

  // =====================================
  // 6. SUCCESSFUL LOGIN
  // =====================================

  it("should log in successfully", async () => {
    const user = userEvent.setup();

    mockLogin.mockResolvedValue(mockAuth);

    render(<Login onLoginSuccess={onLoginSuccess} />);

    await fillLoginForm(user);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Password123",
      });

      expect(mockSaveAuth).toHaveBeenCalledWith(mockAuth);

      expect(onLoginSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================
  // 7. EMAIL NORMALIZATION
  // =====================================

  it("should submit a trimmed email address", async () => {
    const user = userEvent.setup();

    mockLogin.mockResolvedValue(mockAuth);

    render(<Login onLoginSuccess={onLoginSuccess} />);

    await user.type(
      screen.getByLabelText("Email Address"),
      "  user@example.com  ",
    );

    await user.type(screen.getByLabelText("Password"), "Password123");

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Password123",
      });
    });
  });

  // =====================================
  // 8. INVALID CREDENTIALS
  // =====================================

  it("should display an invalid credentials error", async () => {
    const user = userEvent.setup();

    mockLogin.mockRejectedValue(new Error("Invalid email or password"));

    render(<Login onLoginSuccess={onLoginSuccess} />);

    await fillLoginForm(user);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );

    expect(mockSaveAuth).not.toHaveBeenCalled();
    expect(onLoginSuccess).not.toHaveBeenCalled();

    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  // =====================================
  // 9. UNEXPECTED ERROR
  // =====================================

  it("should display a fallback error message", async () => {
    const user = userEvent.setup();

    mockLogin.mockRejectedValue("Unexpected failure");

    render(<Login onLoginSuccess={onLoginSuccess} />);

    await fillLoginForm(user);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to log in",
    );

    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  // =====================================
  // 10. NETWORK FAILURE
  // =====================================

  it("should handle a network error", async () => {
    const user = userEvent.setup();

    mockLogin.mockRejectedValue(new Error("Failed to fetch"));

    render(<Login onLoginSuccess={onLoginSuccess} />);

    await fillLoginForm(user);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to fetch",
    );

    expect(mockSaveAuth).not.toHaveBeenCalled();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  // =====================================
  // 11. LOADING STATE
  // =====================================

  it("should disable the button while signing in", async () => {
    const user = userEvent.setup();

    let resolveLogin!: (value: Awaited<ReturnType<typeof login>>) => void;

    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    render(<Login onLoginSuccess={onLoginSuccess} />);

    await fillLoginForm(user);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    const loadingButton = screen.getByRole("button", {
      name: "Signing in...",
    });

    expect(loadingButton).toBeDisabled();

    await user.click(loadingButton);

    expect(mockLogin).toHaveBeenCalledTimes(1);

    resolveLogin(mockAuth);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
    });

    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
  });

  // =====================================
  // 12. SESSION EXPIRED
  // =====================================

  it("should display session expired notification", () => {
    render(<Login onLoginSuccess={onLoginSuccess} sessionExpired={true} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Session expired");

    expect(
      screen.getByText("For your security, please sign in again to continue."),
    ).toBeInTheDocument();
  });

  // =====================================
  // 13. NO SESSION EXPIRATION
  // =====================================

  it("should not display session expired by default", () => {
    render(<Login onLoginSuccess={onLoginSuccess} />);

    expect(screen.queryByText("Session expired")).not.toBeInTheDocument();
  });

  // =====================================
  // 14. RETRY AFTER FAILED LOGIN
  // =====================================

  it("should allow successful login after a failed attempt", async () => {
    const user = userEvent.setup();

    mockLogin
      .mockRejectedValueOnce(new Error("Invalid email or password"))
      .mockResolvedValueOnce(mockAuth);

    render(<Login onLoginSuccess={onLoginSuccess} />);

    await fillLoginForm(user);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledTimes(1);
      expect(mockSaveAuth).toHaveBeenCalledWith(mockAuth);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    expect(mockLogin).toHaveBeenCalledTimes(2);
  });
});
