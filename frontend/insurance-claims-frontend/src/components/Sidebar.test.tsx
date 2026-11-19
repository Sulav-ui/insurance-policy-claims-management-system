import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, within } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import Sidebar from "./Sidebar";

// =====================================
// MOCK DATA
// =====================================

const mockOnNavigate = vi.fn();

const defaultProps = {
  activePage: "dashboard" as const,
  onNavigate: mockOnNavigate,
};

// =====================================
// SIDEBAR COMPONENT TESTS
// =====================================

describe("Sidebar Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Render sidebar

  it("should render the sidebar component", () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  // 2. Render sidebar title

  it("should display the application title", () => {
    render(<Sidebar {...defaultProps} />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Insurance MS",
      }),
    ).toBeInTheDocument();
  });

  // 3. Render navigation

  it("should render the navigation section", () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  // 4. Render Dashboard button

  it("should render the Dashboard button", () => {
    render(<Sidebar {...defaultProps} />);

    expect(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    ).toBeInTheDocument();
  });

  // 5. Render Policies button

  it("should render the Policies button", () => {
    render(<Sidebar {...defaultProps} />);

    expect(
      screen.getByRole("button", {
        name: "Policies",
      }),
    ).toBeInTheDocument();
  });

  // 6. Render Claims button

  it("should render the Claims button", () => {
    render(<Sidebar {...defaultProps} />);

    expect(
      screen.getByRole("button", {
        name: "Claims",
      }),
    ).toBeInTheDocument();
  });

  // 7. Render exactly three navigation buttons

  it("should render exactly three navigation buttons", () => {
    render(<Sidebar {...defaultProps} />);

    const navigation = screen.getByRole("navigation");

    const buttons = within(navigation).getAllByRole("button");

    expect(buttons).toHaveLength(3);
  });

  // =====================================
  // CSS CLASS TESTS
  // =====================================

  // 8. Sidebar class

  it("should apply the correct sidebar CSS class", () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByRole("complementary")).toHaveClass("sidebar");
  });

  // 9. Sidebar title class

  it("should apply the correct sidebar title class", () => {
    render(<Sidebar {...defaultProps} />);

    expect(
      screen.getByRole("heading", {
        name: "Insurance MS",
      }),
    ).toHaveClass("sidebar-title");
  });

  // 10. Navigation class

  it("should apply the correct navigation CSS class", () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByRole("navigation")).toHaveClass("sidebar-nav");
  });

  // =====================================
  // ACTIVE PAGE TESTS
  // =====================================

  // 11. Dashboard active

  it("should highlight Dashboard when dashboard is active", () => {
    render(<Sidebar {...defaultProps} activePage="dashboard" />);

    expect(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    ).toHaveClass("active");

    expect(
      screen.getByRole("button", {
        name: "Policies",
      }),
    ).not.toHaveClass("active");

    expect(
      screen.getByRole("button", {
        name: "Claims",
      }),
    ).not.toHaveClass("active");
  });

  // 12. Policies active

  it("should highlight Policies when policies is active", () => {
    render(<Sidebar {...defaultProps} activePage="policies" />);

    expect(
      screen.getByRole("button", {
        name: "Policies",
      }),
    ).toHaveClass("active");

    expect(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    ).not.toHaveClass("active");

    expect(
      screen.getByRole("button", {
        name: "Claims",
      }),
    ).not.toHaveClass("active");
  });

  // 13. Claims active

  it("should highlight Claims when claims is active", () => {
    render(<Sidebar {...defaultProps} activePage="claims" />);

    expect(
      screen.getByRole("button", {
        name: "Claims",
      }),
    ).toHaveClass("active");

    expect(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    ).not.toHaveClass("active");

    expect(
      screen.getByRole("button", {
        name: "Policies",
      }),
    ).not.toHaveClass("active");
  });

  // 14. Only one active button

  it("should highlight only one navigation button at a time", () => {
    render(<Sidebar {...defaultProps} />);

    const buttons = screen.getAllByRole("button");

    const activeButtons = buttons.filter((button) =>
      button.classList.contains("active"),
    );

    expect(activeButtons).toHaveLength(1);
  });

  // =====================================
  // USER INTERACTION TESTS
  // =====================================

  // 15. Navigate to Dashboard

  it("should navigate to dashboard when Dashboard is clicked", async () => {
    const user = userEvent.setup();

    render(<Sidebar {...defaultProps} activePage="policies" />);

    await user.click(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    );

    expect(mockOnNavigate).toHaveBeenCalledWith("dashboard");

    expect(mockOnNavigate).toHaveBeenCalledTimes(1);
  });

  // 16. Navigate to Policies

  it("should navigate to policies when Policies is clicked", async () => {
    const user = userEvent.setup();

    render(<Sidebar {...defaultProps} />);

    await user.click(
      screen.getByRole("button", {
        name: "Policies",
      }),
    );

    expect(mockOnNavigate).toHaveBeenCalledWith("policies");

    expect(mockOnNavigate).toHaveBeenCalledTimes(1);
  });

  // 17. Navigate to Claims

  it("should navigate to claims when Claims is clicked", async () => {
    const user = userEvent.setup();

    render(<Sidebar {...defaultProps} />);

    await user.click(
      screen.getByRole("button", {
        name: "Claims",
      }),
    );

    expect(mockOnNavigate).toHaveBeenCalledWith("claims");

    expect(mockOnNavigate).toHaveBeenCalledTimes(1);
  });

  // 18. No automatic navigation

  it("should not call onNavigate during initial rendering", () => {
    render(<Sidebar {...defaultProps} />);

    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  // =====================================
  // DYNAMIC PROPS TESTS
  // =====================================

  // 19. Update active page

  it("should update the active button when activePage changes", () => {
    const { rerender } = render(<Sidebar {...defaultProps} />);

    expect(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    ).toHaveClass("active");

    rerender(<Sidebar {...defaultProps} activePage="policies" />);

    expect(
      screen.getByRole("button", {
        name: "Policies",
      }),
    ).toHaveClass("active");

    expect(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    ).not.toHaveClass("active");

    rerender(<Sidebar {...defaultProps} activePage="claims" />);

    expect(
      screen.getByRole("button", {
        name: "Claims",
      }),
    ).toHaveClass("active");

    expect(
      screen.getByRole("button", {
        name: "Policies",
      }),
    ).not.toHaveClass("active");

    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  // =====================================
  // KEYBOARD ACCESSIBILITY TESTS
  // =====================================

  // 20. Keyboard navigation

  it("should support navigation using the keyboard", async () => {
    const user = userEvent.setup();

    render(<Sidebar {...defaultProps} />);

    await user.tab();

    expect(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    ).toHaveFocus();

    await user.tab();

    expect(
      screen.getByRole("button", {
        name: "Policies",
      }),
    ).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(mockOnNavigate).toHaveBeenCalledWith("policies");

    await user.tab();

    expect(
      screen.getByRole("button", {
        name: "Claims",
      }),
    ).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(mockOnNavigate).toHaveBeenNthCalledWith(2, "claims");

    expect(mockOnNavigate).toHaveBeenCalledTimes(2);
  });
});
