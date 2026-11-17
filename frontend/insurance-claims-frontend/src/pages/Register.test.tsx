import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, fireEvent, act } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import Register from "./Register";

import { register, type AuthResponse } from "../services/authService";

// =====================================
// MOCK AUTH SERVICE
// =====================================

vi.mock("../services/authService", () => ({
  register: vi.fn(),
}));

const mockRegister = vi.mocked(register);

const mockAuth: AuthResponse = {
  token: "mock-jwt-token",
  tokenType: "Bearer",
  role: "USER",
  email: "john@example.com",
};

// =====================================
// REGISTER COMPONENT TESTS
// =====================================

describe("Register Component", () => {
  const onBackToLogin = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  // =====================================
  // HELPER FUNCTIONS
  // =====================================

  function renderRegister() {
    return render(<Register onBackToLogin={onBackToLogin} />);
  }

  function getSubmitButton() {
    return screen.getByRole("button", {
      name: "Create Account",
    });
  }

  function getRegistrationForm() {
    const form = getSubmitButton().closest("form");

    if (!form) {
      throw new Error("Registration form not found");
    }

    return form;
  }

  async function fillRegistrationForm(
    user: ReturnType<typeof userEvent.setup>,
    fullName = "John Smith",
    email = "john@example.com",
    password = "Password123",
    confirmPassword = "Password123",
  ) {
    if (fullName) {
      await user.type(screen.getByLabelText("Full Name"), fullName);
    }

    if (email) {
      await user.type(screen.getByLabelText("Email Address"), email);
    }

    if (password) {
      await user.type(
        screen.getByLabelText("Password", {
          exact: true,
        }),
        password,
      );
    }

    if (confirmPassword) {
      await user.type(
        screen.getByLabelText("Confirm Password"),
        confirmPassword,
      );
    }
  }

  // =====================================
  // FORM RENDERING AND INPUT HANDLING
  // =====================================

  // 1. Render registration form

  it("should render the registration form", () => {
    renderRegister();

    expect(
      screen.getByRole("heading", {
        name: "Create Account",
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();

    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();

    expect(
      screen.getByLabelText("Password", {
        exact: true,
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();

    expect(getSubmitButton()).toBeEnabled();

    expect(
      screen.getByRole("button", {
        name: "Sign In",
      }),
    ).toBeInTheDocument();
  });

  // 2. Full name input

  it("should accept full name input", async () => {
    const user = userEvent.setup();

    renderRegister();

    const input = screen.getByLabelText("Full Name");

    await user.type(input, "John Smith");

    expect(input).toHaveValue("John Smith");
  });

  // 3. Email input

  it("should accept email input", async () => {
    const user = userEvent.setup();

    renderRegister();

    const input = screen.getByLabelText("Email Address");

    await user.type(input, "john@example.com");

    expect(input).toHaveValue("john@example.com");
  });

  // 4. Password input

  it("should accept and mask password input", async () => {
    const user = userEvent.setup();

    renderRegister();

    const input = screen.getByLabelText("Password", {
      exact: true,
    });

    await user.type(input, "Password123");

    expect(input).toHaveValue("Password123");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("minlength", "8");
  });

  // 5. Confirm password input

  it("should accept and mask confirm password input", async () => {
    const user = userEvent.setup();

    renderRegister();

    const input = screen.getByLabelText("Confirm Password");

    await user.type(input, "Password123");

    expect(input).toHaveValue("Password123");
    expect(input).toHaveAttribute("type", "password");
  });

  // =====================================
  // FORM VALIDATION
  // =====================================

  // 6. Empty required fields

  it("should prevent submission with empty fields", async () => {
    const user = userEvent.setup();

    renderRegister();

    await user.click(getSubmitButton());

    expect(screen.getByLabelText("Full Name")).toBeInvalid();

    expect(screen.getByLabelText("Email Address")).toBeInvalid();

    expect(
      screen.getByLabelText("Password", {
        exact: true,
      }),
    ).toBeInvalid();

    expect(screen.getByLabelText("Confirm Password")).toBeInvalid();

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // 7. Whitespace-only name

  it("should reject a whitespace-only full name", async () => {
    const user = userEvent.setup();

    renderRegister();

    await fillRegistrationForm(user, "   ");

    await user.click(getSubmitButton());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter your full name.",
    );

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // 8. Empty email

  it("should reject an empty email address", async () => {
    const user = userEvent.setup();

    renderRegister();

    await fillRegistrationForm(user, "John Smith", "");

    fireEvent.submit(getRegistrationForm());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter your email address.",
    );

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // 9. Invalid email format

  it("should reject an invalid email address", async () => {
    const user = userEvent.setup();

    renderRegister();

    await fillRegistrationForm(user, "John Smith", "invalid-email");

    await user.click(getSubmitButton());

    expect(screen.getByLabelText("Email Address")).toBeInvalid();

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // 10. Short password

  it("should reject passwords shorter than 8 characters", async () => {
    const user = userEvent.setup();

    renderRegister();

    await fillRegistrationForm(
      user,
      "John Smith",
      "john@example.com",
      "1234567",
      "1234567",
    );

    fireEvent.submit(getRegistrationForm());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Password must be at least 8 characters.",
    );

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // 11. Mismatched passwords

  it("should reject mismatched passwords", async () => {
    const user = userEvent.setup();

    renderRegister();

    await fillRegistrationForm(
      user,
      "John Smith",
      "john@example.com",
      "Password123",
      "Different123",
    );

    await user.click(getSubmitButton());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Passwords do not match.",
    );

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // =====================================
  // SUCCESSFUL REGISTRATION
  // =====================================

  // 12. Successful registration

  it("should register a user successfully", async () => {
    const user = userEvent.setup();

    mockRegister.mockResolvedValue(mockAuth);

    renderRegister();

    await fillRegistrationForm(user);

    await user.click(getSubmitButton());

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Account created successfully! You can now sign in.",
    );

    expect(mockRegister).toHaveBeenCalledTimes(1);

    expect(mockRegister).toHaveBeenCalledWith({
      fullName: "John Smith",
      email: "john@example.com",
      password: "Password123",
    });

    expect(onBackToLogin).not.toHaveBeenCalled();
  });

  // 13. Normalize name and email

  it("should trim full name and normalize email", async () => {
    const user = userEvent.setup();

    mockRegister.mockResolvedValue(mockAuth);

    renderRegister();

    await fillRegistrationForm(user, "  John Smith  ", "JOHN@EXAMPLE.COM");

    await user.click(getSubmitButton());

    expect(await screen.findByRole("status")).toBeInTheDocument();

    expect(mockRegister).toHaveBeenCalledWith({
      fullName: "John Smith",
      email: "john@example.com",
      password: "Password123",
    });
  });

  // 14. Minimum valid password

  it("should accept a password of exactly 8 characters", async () => {
    const user = userEvent.setup();

    mockRegister.mockResolvedValue(mockAuth);

    renderRegister();

    await fillRegistrationForm(
      user,
      "John Smith",
      "john@example.com",
      "Pass1234",
      "Pass1234",
    );

    await user.click(getSubmitButton());

    expect(await screen.findByRole("status")).toBeInTheDocument();

    expect(mockRegister).toHaveBeenCalledWith({
      fullName: "John Smith",
      email: "john@example.com",
      password: "Pass1234",
    });
  });

  // =====================================
  // ERROR HANDLING
  // =====================================

  // 15. Registration failure

  it("should display a registration failure error", async () => {
    const user = userEvent.setup();

    mockRegister.mockRejectedValue(new Error("Registration failed"));

    renderRegister();

    await fillRegistrationForm(user);

    await user.click(getSubmitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Registration failed",
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    expect(getSubmitButton()).toBeEnabled();
  });

  // 16. Unexpected error

  it("should display a fallback error message", async () => {
    const user = userEvent.setup();

    mockRegister.mockRejectedValue("Unexpected failure");

    renderRegister();

    await fillRegistrationForm(user);

    await user.click(getSubmitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to create account.",
    );
  });

  // 17. Network failure

  it("should handle network errors", async () => {
    const user = userEvent.setup();

    mockRegister.mockRejectedValue(new Error("Failed to fetch"));

    renderRegister();

    await fillRegistrationForm(user);

    await user.click(getSubmitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to fetch",
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    expect(onBackToLogin).not.toHaveBeenCalled();
  });

  // =====================================
  // LOADING STATE
  // =====================================

  // 18. Loading and duplicate submission

  it("should disable inputs and prevent duplicate submissions", async () => {
    const user = userEvent.setup();

    let resolveRegistration!: (value: AuthResponse) => void;

    mockRegister.mockReturnValue(
      new Promise<AuthResponse>((resolve) => {
        resolveRegistration = resolve;
      }),
    );

    renderRegister();

    await fillRegistrationForm(user);

    const form = getRegistrationForm();

    await user.click(getSubmitButton());

    const loadingButton = screen.getByRole("button", {
      name: "Creating Account...",
    });

    expect(loadingButton).toBeDisabled();

    expect(screen.getByLabelText("Full Name")).toBeDisabled();

    expect(screen.getByLabelText("Email Address")).toBeDisabled();

    expect(
      screen.getByLabelText("Password", {
        exact: true,
      }),
    ).toBeDisabled();

    expect(screen.getByLabelText("Confirm Password")).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Sign In",
      }),
    ).toBeDisabled();

    await user.click(loadingButton);

    fireEvent.submit(form);

    expect(mockRegister).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRegistration(mockAuth);
    });

    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  // =====================================
  // NAVIGATION
  // =====================================

  // 19. Navigate back to sign in

  it("should navigate back to the login page", async () => {
    const user = userEvent.setup();

    renderRegister();

    await user.click(
      screen.getByRole("button", {
        name: "Sign In",
      }),
    );

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });

  // 20. Navigate after successful registration

  it("should navigate to login after successful registration", async () => {
    const user = userEvent.setup();

    mockRegister.mockResolvedValue(mockAuth);

    renderRegister();

    await fillRegistrationForm(user);

    await user.click(getSubmitButton());

    const goToSignIn = await screen.findByRole("button", {
      name: "Go to Sign In",
    });

    await user.click(goToSignIn);

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });

  // =====================================
  // SUCCESS STATE
  // =====================================

  // 21. Hide registration form

  it("should hide the form after successful registration", async () => {
    const user = userEvent.setup();

    mockRegister.mockResolvedValue(mockAuth);

    renderRegister();

    await fillRegistrationForm(user);

    await user.click(getSubmitButton());

    expect(await screen.findByRole("status")).toBeInTheDocument();

    expect(screen.queryByLabelText("Full Name")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Email Address")).not.toBeInTheDocument();

    expect(
      screen.queryByLabelText("Password", {
        exact: true,
      }),
    ).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Confirm Password")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Create Account",
      }),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // RETRY MECHANISM
  // =====================================

  // 22. Retry after failure

  it("should allow registration after a failed attempt", async () => {
    const user = userEvent.setup();

    mockRegister
      .mockRejectedValueOnce(new Error("Unable to connect to server"))
      .mockResolvedValueOnce(mockAuth);

    renderRegister();

    await fillRegistrationForm(user);

    await user.click(getSubmitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to connect to server",
    );

    expect(getSubmitButton()).toBeEnabled();

    await user.click(getSubmitButton());

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Account created successfully! You can now sign in.",
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    expect(mockRegister).toHaveBeenCalledTimes(2);
  });
});
