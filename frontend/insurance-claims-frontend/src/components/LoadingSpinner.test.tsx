import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";

import LoadingSpinner from "./LoadingSpinner";

// =====================================
// LOADING SPINNER COMPONENT TESTS
// =====================================

describe("LoadingSpinner Component", () => {
  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Render component

  it("should render the loading spinner component", () => {
    render(<LoadingSpinner />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // 2. Default message

  it("should display the default loading message", () => {
    render(<LoadingSpinner />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  // 3. Custom message

  it("should display a custom loading message", () => {
    render(<LoadingSpinner message="Loading policies..." />);

    expect(screen.getByText("Loading policies...")).toBeInTheDocument();
  });

  // 4. Replace default message

  it("should not display the default message when a custom message is provided", () => {
    render(<LoadingSpinner message="Loading claims..." />);

    expect(screen.getByText("Loading claims...")).toBeInTheDocument();

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  // =====================================
  // CSS CLASS TESTS
  // =====================================

  // 5. Loading container class

  it("should have the correct loading container class", () => {
    render(<LoadingSpinner />);

    expect(screen.getByRole("status")).toHaveClass("loading-container");
  });

  // 6. Loading spinner class

  it("should render the spinner element with the correct class", () => {
    const { container } = render(<LoadingSpinner />);

    const spinner = container.querySelector(".loading-spinner");

    expect(spinner).toBeInTheDocument();

    expect(spinner).toHaveClass("loading-spinner");
  });

  // =====================================
  // ACCESSIBILITY TESTS
  // =====================================

  // 7. Status role

  it("should provide an accessible status containing the loading message", () => {
    render(<LoadingSpinner />);

    const status = screen.getByRole("status");

    expect(status).toHaveAttribute("role", "status");

    expect(status).toHaveTextContent("Loading...");
  });

  // 8. Decorative spinner accessibility

  it("should hide the decorative spinner from screen readers", () => {
    const { container } = render(<LoadingSpinner />);

    const spinner = container.querySelector(".loading-spinner");

    expect(spinner).toHaveAttribute("aria-hidden", "true");
  });

  // =====================================
  // EDGE CASE TESTS
  // =====================================

  // 9. Empty message

  it("should render correctly when an empty message is provided", () => {
    const { container } = render(<LoadingSpinner message="" />);

    expect(screen.getByRole("status")).toBeInTheDocument();

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

    const paragraph = container.querySelector("p");

    expect(paragraph).toBeInTheDocument();

    expect(paragraph).toBeEmptyDOMElement();
  });

  // 10. Updated props

  it("should update the loading message when props change", () => {
    const { rerender } = render(
      <LoadingSpinner message="Loading policies..." />,
    );

    expect(screen.getByText("Loading policies...")).toBeInTheDocument();

    rerender(<LoadingSpinner message="Loading claims..." />);

    expect(screen.getByText("Loading claims...")).toBeInTheDocument();

    expect(screen.queryByText("Loading policies...")).not.toBeInTheDocument();
  });
});
