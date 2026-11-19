import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";

import EmptyState from "./EmptyState";

// =====================================
// MOCK PROPS
// =====================================

const defaultProps = {
  title: "No Policies Found",
  message: "There are no policies available.",
};

// =====================================
// EMPTY STATE COMPONENT TESTS
// =====================================

describe("EmptyState Component", () => {
  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Render component

  it("should render the empty state component", () => {
    const { container } = render(<EmptyState {...defaultProps} />);

    expect(container.querySelector(".empty-state")).toBeInTheDocument();
  });

  // 2. Display title

  it("should display the provided title", () => {
    render(<EmptyState {...defaultProps} />);

    expect(screen.getByText("No Policies Found")).toBeInTheDocument();
  });

  // 3. Display message

  it("should display the provided message", () => {
    render(<EmptyState {...defaultProps} />);

    expect(
      screen.getByText("There are no policies available."),
    ).toBeInTheDocument();
  });

  // =====================================
  // ICON TESTS
  // =====================================

  // 4. Default icon

  it("should display the default folder icon", () => {
    render(<EmptyState {...defaultProps} />);

    expect(screen.getByText("📂")).toBeInTheDocument();
  });

  // 5. Custom icon

  it("should display a custom icon", () => {
    render(<EmptyState {...defaultProps} icon="🔍" />);

    expect(screen.getByText("🔍")).toBeInTheDocument();
  });

  // 6. Replace default icon

  it("should not display the default icon when a custom icon is provided", () => {
    render(<EmptyState {...defaultProps} icon="📋" />);

    expect(screen.getByText("📋")).toBeInTheDocument();

    expect(screen.queryByText("📂")).not.toBeInTheDocument();
  });

  // =====================================
  // CSS CLASS TESTS
  // =====================================

  // 7. Container CSS class

  it("should have the correct empty state container class", () => {
    const { container } = render(<EmptyState {...defaultProps} />);

    const emptyState = container.querySelector(".empty-state");

    expect(emptyState).toHaveClass("empty-state");
  });

  // 8. Icon CSS class

  it("should have the correct icon class", () => {
    render(<EmptyState {...defaultProps} />);

    expect(screen.getByText("📂")).toHaveClass("empty-state-icon");
  });

  // =====================================
  // ACCESSIBILITY TESTS
  // =====================================

  // 9. Semantic heading

  it("should render the title as a level three heading", () => {
    render(<EmptyState {...defaultProps} />);

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "No Policies Found",
      }),
    ).toBeInTheDocument();
  });

  // 10. Decorative icon accessibility

  it("should hide the decorative icon from screen readers", () => {
    render(<EmptyState {...defaultProps} />);

    expect(screen.getByText("📂")).toHaveAttribute("aria-hidden", "true");
  });

  // =====================================
  // EDGE CASE TESTS
  // =====================================

  // 11. Empty icon

  it("should render correctly when an empty icon is provided", () => {
    const { container } = render(<EmptyState {...defaultProps} icon="" />);

    const icon = container.querySelector(".empty-state-icon");

    expect(icon).toBeInTheDocument();

    expect(icon).toBeEmptyDOMElement();

    expect(screen.queryByText("📂")).not.toBeInTheDocument();

    expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
  });

  // 12. Updated props

  it("should update the title, message and icon when props change", () => {
    const { rerender } = render(<EmptyState {...defaultProps} />);

    rerender(
      <EmptyState
        title="No Claims Found"
        message="There are no claims available."
        icon="📋"
      />,
    );

    expect(screen.getByText("No Claims Found")).toBeInTheDocument();

    expect(
      screen.getByText("There are no claims available."),
    ).toBeInTheDocument();

    expect(screen.getByText("📋")).toBeInTheDocument();

    expect(screen.queryByText(defaultProps.title)).not.toBeInTheDocument();

    expect(screen.queryByText(defaultProps.message)).not.toBeInTheDocument();

    expect(screen.queryByText("📂")).not.toBeInTheDocument();
  });
});
