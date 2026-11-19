import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import Toast from "./Toast";

// =====================================
// MOCK DATA
// =====================================

const successMessage = "Policy created successfully!";
const errorMessage = "Failed to create policy.";

// =====================================
// TOAST COMPONENT TESTS
// =====================================

describe("Toast Component", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Render success message

  it("should display the success message", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    expect(screen.getByText(successMessage)).toBeInTheDocument();
  });

  // 2. Render error message

  it("should display the error message", () => {
    render(<Toast message={errorMessage} type="error" onClose={mockOnClose} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  // 3. Success icon

  it("should display the success icon", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    expect(screen.getByText("✓")).toBeInTheDocument();

    expect(screen.queryByText("✕")).not.toBeInTheDocument();
  });

  // 4. Error icon

  it("should display the error icon", () => {
    render(<Toast message={errorMessage} type="error" onClose={mockOnClose} />);

    expect(screen.getByText("✕")).toBeInTheDocument();

    expect(screen.queryByText("✓")).not.toBeInTheDocument();
  });

  // =====================================
  // CSS CLASS TESTS
  // =====================================

  // 5. Success styling

  it("should apply the success CSS classes", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    const toast = screen.getByRole("status");

    expect(toast).toHaveClass("toast", "toast-success");

    expect(toast).not.toHaveClass("toast-error");
  });

  // 6. Error styling

  it("should apply the error CSS classes", () => {
    render(<Toast message={errorMessage} type="error" onClose={mockOnClose} />);

    const toast = screen.getByRole("alert");

    expect(toast).toHaveClass("toast", "toast-error");

    expect(toast).not.toHaveClass("toast-success");
  });

  // 7. Icon styling

  it("should apply the correct icon CSS class", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    expect(screen.getByText("✓")).toHaveClass("toast-icon");
  });

  // =====================================
  // ACCESSIBILITY TESTS
  // =====================================

  // 8. Success accessibility role

  it("should use the status role for success notifications", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(successMessage);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // 9. Error accessibility role

  it("should use the alert role for error notifications", () => {
    render(<Toast message={errorMessage} type="error" onClose={mockOnClose} />);

    expect(screen.getByRole("alert")).toHaveTextContent(errorMessage);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // 10. Accessible close button

  it("should render an accessible close button", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    const closeButton = screen.getByRole("button", {
      name: "Close notification",
    });

    expect(closeButton).toBeInTheDocument();

    expect(closeButton).toHaveAttribute("type", "button");

    expect(closeButton).toHaveClass("toast-close");

    expect(closeButton).toHaveTextContent("×");
  });

  // =====================================
  // USER INTERACTION TESTS
  // =====================================

  // 11. Manually close success toast

  it("should call onClose when the success notification is closed", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Close notification",
      }),
    );

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // 12. Manually close error toast

  it("should call onClose when the error notification is closed", () => {
    render(<Toast message={errorMessage} type="error" onClose={mockOnClose} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Close notification",
      }),
    );

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // =====================================
  // AUTOMATIC DISMISSAL TESTS
  // =====================================

  // 13. Do not dismiss immediately

  it("should not call onClose immediately after rendering", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  // 14. Do not dismiss before 3000 ms

  it("should not dismiss the notification before three seconds", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  // 15. Automatically dismiss success notification

  it("should automatically close a success notification after three seconds", () => {
    render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // 16. Automatically dismiss error notification

  it("should automatically close an error notification after three seconds", () => {
    render(<Toast message={errorMessage} type="error" onClose={mockOnClose} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // =====================================
  // LIFECYCLE AND CLEANUP TESTS
  // =====================================

  // 17. Clean up timer on unmount

  it("should clear the timer when the component unmounts", () => {
    const { unmount } = render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  // 18. Reset timer when message changes

  it("should reset the timer when the message changes", () => {
    const { rerender } = render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    rerender(
      <Toast
        message="Claim created successfully!"
        type="success"
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Claim created successfully!")).toBeInTheDocument();

    expect(screen.queryByText(successMessage)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(mockOnClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // 19. Reset timer when notification type changes

  it("should reset the timer when the notification type changes", () => {
    const { rerender } = render(
      <Toast message="Notification" type="success" onClose={mockOnClose} />,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    rerender(
      <Toast message="Notification" type="error" onClose={mockOnClose} />,
    );

    expect(screen.getByRole("alert")).toHaveClass("toast-error");

    expect(screen.getByText("✕")).toBeInTheDocument();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(mockOnClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // 20. Reset timer when callback changes

  it("should reset the timer and use the latest onClose callback", () => {
    const newOnClose = vi.fn();

    const { rerender } = render(
      <Toast message={successMessage} type="success" onClose={mockOnClose} />,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    rerender(
      <Toast message={successMessage} type="success" onClose={newOnClose} />,
    );

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(newOnClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(newOnClose).toHaveBeenCalledTimes(1);
  });
});
