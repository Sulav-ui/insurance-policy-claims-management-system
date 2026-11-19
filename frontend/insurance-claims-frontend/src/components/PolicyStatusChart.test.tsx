import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "@testing-library/react";

import type { ReactNode } from "react";
import type { Policy } from "../types/Policy";

import PolicyStatusChart from "./PolicyStatusChart";

// =====================================
// MOCK RECHARTS
// =====================================

vi.mock("recharts", () => ({
  ResponsiveContainer: ({
    children,
    width,
    height,
  }: {
    children: ReactNode;
    width: string | number;
    height: string | number;
  }) => (
    <div
      data-testid="responsive-container"
      data-width={width}
      data-height={height}
    >
      {children}
    </div>
  ),

  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),

  Pie: ({
    children,
    data,
    dataKey,
    nameKey,
    cx,
    cy,
    outerRadius,
    label,
  }: {
    children: ReactNode;
    data: { name: string; value: number }[];
    dataKey: string;
    nameKey: string;
    cx: string;
    cy: string;
    outerRadius: number;
    label: boolean;
  }) => (
    <div
      data-testid="pie"
      data-datakey={dataKey}
      data-namekey={nameKey}
      data-cx={cx}
      data-cy={cy}
      data-radius={outerRadius}
      data-label={String(label)}
    >
      {data.map((entry) => (
        <div
          key={entry.name}
          data-testid={`chart-data-${entry.name.toLowerCase()}`}
        >
          {entry.value}
        </div>
      ))}

      {children}
    </div>
  ),

  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="chart-cell" data-fill={fill} />
  ),

  Tooltip: () => <div data-testid="chart-tooltip" />,

  Legend: () => <div data-testid="chart-legend" />,
}));

// =====================================
// MOCK DATA
// =====================================

function createMockPolicy(id: number, status: Policy["status"]): Policy {
  return {
    id,
    policyNumber: `POL-${String(id).padStart(3, "0")}`,
    policyHolderName: `Policy Holder ${id}`,
    policyType: "HEALTH",
    premiumAmount: 1500,
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    status,
  };
}

const mockPolicies: Policy[] = [
  createMockPolicy(1, "ACTIVE"),
  createMockPolicy(2, "ACTIVE"),
  createMockPolicy(3, "ACTIVE"),
  createMockPolicy(4, "ACTIVE"),
  createMockPolicy(5, "ACTIVE"),
  createMockPolicy(6, "ACTIVE"),

  createMockPolicy(7, "EXPIRED"),
  createMockPolicy(8, "EXPIRED"),

  createMockPolicy(9, "CANCELLED"),
  createMockPolicy(10, "CANCELLED"),
];

// =====================================
// HELPER FUNCTIONS
// =====================================

function expectChartCounts(active: number, expired: number, cancelled: number) {
  expect(screen.getByTestId("chart-data-active").textContent).toBe(
    String(active),
  );

  expect(screen.getByTestId("chart-data-expired").textContent).toBe(
    String(expired),
  );

  expect(screen.getByTestId("chart-data-cancelled").textContent).toBe(
    String(cancelled),
  );
}

// =====================================
// POLICY STATUS CHART TESTS
// =====================================

describe("PolicyStatusChart Component", () => {
  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Chart heading

  it("should render the policy status chart heading", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(
      screen.getByRole("heading", {
        name: "Policy Status Distribution",
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  // 2. Chart container

  it("should render the correct chart container", () => {
    const { container } = render(<PolicyStatusChart policies={mockPolicies} />);

    expect(container.querySelector(".claims-chart")).toBeInTheDocument();
  });

  // 3. Responsive container

  it("should render the responsive container", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  // 4. Pie chart

  it("should render the PieChart component", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  // 5. Pie component hierarchy

  it("should render the Pie component inside the PieChart", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    const chart = screen.getByTestId("pie-chart");

    expect(within(chart).getByTestId("pie")).toBeInTheDocument();
  });

  // =====================================
  // EMPTY STATE TESTS
  // =====================================

  // 6. Empty policies message

  it("should display a message when no policies are available", () => {
    render(<PolicyStatusChart policies={[]} />);

    expect(
      screen.getByText("No policies available for chart."),
    ).toBeInTheDocument();
  });

  // 7. Hide chart for empty data

  it("should not render chart components when policies are empty", () => {
    render(<PolicyStatusChart policies={[]} />);

    expect(
      screen.queryByTestId("responsive-container"),
    ).not.toBeInTheDocument();

    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: "Policy Status Distribution",
      }),
    ).not.toBeInTheDocument();
  });

  // 8. Hide empty message

  it("should not display the empty message when policies exist", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(
      screen.queryByText("No policies available for chart."),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // CHART CONFIGURATION TESTS
  // =====================================

  // 9. Responsive dimensions

  it("should configure the responsive container dimensions correctly", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    const container = screen.getByTestId("responsive-container");

    expect(container).toHaveAttribute("data-width", "100%");

    expect(container).toHaveAttribute("data-height", "300");
  });

  // 10. Chart data keys

  it("should configure dataKey and nameKey correctly", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    const pie = screen.getByTestId("pie");

    expect(pie).toHaveAttribute("data-datakey", "value");

    expect(pie).toHaveAttribute("data-namekey", "name");
  });

  // 11. Chart position

  it("should position the pie chart at the center", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    const pie = screen.getByTestId("pie");

    expect(pie).toHaveAttribute("data-cx", "50%");

    expect(pie).toHaveAttribute("data-cy", "50%");
  });

  // 12. Outer radius

  it("should configure the correct outer radius", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(screen.getByTestId("pie")).toHaveAttribute("data-radius", "100");
  });

  // 13. Chart labels

  it("should enable pie chart labels", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(screen.getByTestId("pie")).toHaveAttribute("data-label", "true");
  });

  // =====================================
  // DATA AGGREGATION TESTS
  // =====================================

  // 14. Active policies

  it("should correctly count active policies", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(screen.getByTestId("chart-data-active").textContent).toBe("6");
  });

  // 15. Expired policies

  it("should correctly count expired policies", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(screen.getByTestId("chart-data-expired").textContent).toBe("2");
  });

  // 16. Cancelled policies

  it("should correctly count cancelled policies", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(screen.getByTestId("chart-data-cancelled").textContent).toBe("2");
  });

  // 17. All active policies

  it("should handle a dataset containing only active policies", () => {
    const policies = [
      createMockPolicy(1, "ACTIVE"),
      createMockPolicy(2, "ACTIVE"),
      createMockPolicy(3, "ACTIVE"),
    ];

    render(<PolicyStatusChart policies={policies} />);

    expectChartCounts(3, 0, 0);
  });

  // 18. All expired policies

  it("should handle a dataset containing only expired policies", () => {
    const policies = [
      createMockPolicy(1, "EXPIRED"),
      createMockPolicy(2, "EXPIRED"),
    ];

    render(<PolicyStatusChart policies={policies} />);

    expectChartCounts(0, 2, 0);
  });

  // 19. All cancelled policies

  it("should handle a dataset containing only cancelled policies", () => {
    const policies = [
      createMockPolicy(1, "CANCELLED"),
      createMockPolicy(2, "CANCELLED"),
    ];

    render(<PolicyStatusChart policies={policies} />);

    expectChartCounts(0, 0, 2);
  });

  // 20. Case-insensitive status matching

  it("should count policy statuses regardless of capitalization", () => {
    const policies = [
      createMockPolicy(1, "active" as Policy["status"]),
      createMockPolicy(2, "Active" as Policy["status"]),
      createMockPolicy(3, "expired" as Policy["status"]),
      createMockPolicy(4, "Expired" as Policy["status"]),
      createMockPolicy(5, "cancelled" as Policy["status"]),
      createMockPolicy(6, "Cancelled" as Policy["status"]),
    ];

    render(<PolicyStatusChart policies={policies} />);

    expectChartCounts(2, 2, 2);
  });

  // 21. Excluded statuses

  it("should exclude inactive and unsupported statuses from the current chart", () => {
    const policies = [
      createMockPolicy(1, "ACTIVE"),
      createMockPolicy(2, "EXPIRED"),
      createMockPolicy(3, "CANCELLED"),
      createMockPolicy(4, "INACTIVE"),
      createMockPolicy(5, "UNKNOWN" as Policy["status"]),
    ];

    render(<PolicyStatusChart policies={policies} />);

    expectChartCounts(1, 1, 1);

    expect(screen.queryByTestId("chart-data-inactive")).not.toBeInTheDocument();
  });

  // =====================================
  // COLOR MAPPING TESTS
  // =====================================

  // 22. Status colors

  it("should assign the correct colors to policy statuses", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    const cells = screen.getAllByTestId("chart-cell");

    expect(cells).toHaveLength(3);

    expect(cells[0]).toHaveAttribute("data-fill", "#10b981");

    expect(cells[1]).toHaveAttribute("data-fill", "#f59e0b");

    expect(cells[2]).toHaveAttribute("data-fill", "#ef4444");
  });

  // =====================================
  // TOOLTIP AND LEGEND
  // =====================================

  // 23. Tooltip

  it("should render the chart tooltip", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(screen.getByTestId("chart-tooltip")).toBeInTheDocument();
  });

  // 24. Legend

  it("should render the chart legend", () => {
    render(<PolicyStatusChart policies={mockPolicies} />);

    expect(screen.getByTestId("chart-legend")).toBeInTheDocument();
  });

  // =====================================
  // DYNAMIC DATA UPDATES
  // =====================================

  // 25. Rerender with updated policies

  it("should update the chart when the policies prop changes", () => {
    const { rerender } = render(<PolicyStatusChart policies={mockPolicies} />);

    expectChartCounts(6, 2, 2);

    const updatedPolicies = [
      createMockPolicy(1, "ACTIVE"),
      createMockPolicy(2, "EXPIRED"),
      createMockPolicy(3, "EXPIRED"),
      createMockPolicy(4, "CANCELLED"),
    ];

    rerender(<PolicyStatusChart policies={updatedPolicies} />);

    expectChartCounts(1, 2, 1);

    rerender(<PolicyStatusChart policies={[]} />);

    expect(
      screen.getByText("No policies available for chart."),
    ).toBeInTheDocument();

    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();

    rerender(<PolicyStatusChart policies={mockPolicies} />);

    expectChartCounts(6, 2, 2);
  });
});
