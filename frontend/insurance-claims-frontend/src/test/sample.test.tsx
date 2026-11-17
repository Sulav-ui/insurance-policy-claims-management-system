import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Insurance Management System</h1>

      <p>Count: {count}</p>

      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

describe("Frontend Testing Setup", () => {
  it("should perform a basic calculation", () => {
    expect(2 + 3).toBe(5);
  });

  it("should render the component heading", () => {
    render(<Counter />);

    expect(
      screen.getByRole("heading", {
        name: "Insurance Management System",
      }),
    ).toBeInTheDocument();
  });

  it("should display the initial count", () => {
    render(<Counter />);

    expect(screen.getByText("Count: 0")).toBeInTheDocument();
  });

  it("should increment the count when clicked", async () => {
    const user = userEvent.setup();

    render(<Counter />);

    await user.click(
      screen.getByRole("button", {
        name: "Increment",
      }),
    );

    expect(screen.getByText("Count: 1")).toBeInTheDocument();
  });
});
