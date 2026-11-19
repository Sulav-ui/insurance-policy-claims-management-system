import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "@testing-library/react";

import type { ReactNode } from "react";
import type { Claim } from "../types/Claim";

import ClaimsStatusChart from "./ClaimsStatusChart";

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

function createMockClaim(id: number, status: Claim["status"]): Claim {
  return {
    id,
    claimNumber: `CLM-${String(id).padStart(3, "0")}`,
    claimAmount: 1800,
    claimDate: "2026-11-10",
    description: "Medical expense claim",
    status,
    policyId: 1,
  };
}

const mockClaims: Claim[] = [
  createMockClaim(1, "PENDING"),
  createMockClaim(2, "PENDING"),
  createMockClaim(3, "PENDING"),
  createMockClaim(4, "PENDING"),

  createMockClaim(5, "APPROVED"),
  createMockClaim(6, "APPROVED"),
  createMockClaim(7, "APPROVED"),
  createMockClaim(8, "APPROVED"),

  createMockClaim(9, "REJECTED"),
  createMockClaim(10, "REJECTED"),
];

// =====================================
// HELPER FUNCTIONS
// =====================================

function expectChartCounts(
  pending: number,
  approved: number,
  rejected: number,
) {
  expect(screen.getByTestId("chart-data-pending").textContent).toBe(
    String(pending),
  );

  expect(screen.getByTestId("chart-data-approved").textContent).toBe(
    String(approved),
  );

  expect(screen.getByTestId("chart-data-rejected").textContent).toBe(
    String(rejected),
  );
}

// =====================================
// CLAIMS STATUS CHART TESTS
// =====================================

describe("ClaimsStatusChart Component", () => {
  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Chart heading

  it("should render the chart heading", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(
      screen.getByRole("heading", {
        name: "Claims Status Distribution",
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  // 2. Chart container

  it("should render the correct chart container", () => {
    const { container } = render(<ClaimsStatusChart claims={mockClaims} />);

    expect(container.querySelector(".claims-chart")).toBeInTheDocument();
  });

  // 3. Responsive container

  it("should render the responsive container", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  // 4. Pie chart

  it("should render the pie chart component", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  // 5. Pie component

  it("should render the Pie component inside the PieChart", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    const chart = screen.getByTestId("pie-chart");

    expect(within(chart).getByTestId("pie")).toBeInTheDocument();
  });

  // =====================================
  // EMPTY STATE TESTS
  // =====================================

  // 6. Empty claims message

  it("should display an empty message when claims are unavailable", () => {
    render(<ClaimsStatusChart claims={[]} />);

    expect(
      screen.getByText("No claims available for chart."),
    ).toBeInTheDocument();
  });

  // 7. No chart for empty data

  it("should not render chart components when the claims array is empty", () => {
    render(<ClaimsStatusChart claims={[]} />);

    expect(
      screen.queryByTestId("responsive-container"),
    ).not.toBeInTheDocument();

    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: "Claims Status Distribution",
      }),
    ).not.toBeInTheDocument();
  });

  // 8. Hide empty message

  it("should not display the empty message when claims exist", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(
      screen.queryByText("No claims available for chart."),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // CHART CONFIGURATION TESTS
  // =====================================

  // 9. Responsive dimensions

  it("should configure the responsive container dimensions correctly", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    const container = screen.getByTestId("responsive-container");

    expect(container).toHaveAttribute("data-width", "100%");

    expect(container).toHaveAttribute("data-height", "300");
  });

  // 10. Data and name keys

  it("should configure the pie dataKey and nameKey correctly", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    const pie = screen.getByTestId("pie");

    expect(pie).toHaveAttribute("data-datakey", "value");

    expect(pie).toHaveAttribute("data-namekey", "name");
  });

  // 11. Center position

  it("should position the pie chart at the center", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    const pie = screen.getByTestId("pie");

    expect(pie).toHaveAttribute("data-cx", "50%");

    expect(pie).toHaveAttribute("data-cy", "50%");
  });

  // 12. Outer radius

  it("should configure the outer radius to 100", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(screen.getByTestId("pie")).toHaveAttribute("data-radius", "100");
  });

  // 13. Chart labels

  it("should enable pie chart labels", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(screen.getByTestId("pie")).toHaveAttribute("data-label", "true");
  });

  // =====================================
  // DATA AGGREGATION TESTS
  // =====================================

  // 14. Pending claims

  it("should correctly count pending claims", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(screen.getByTestId("chart-data-pending")).toHaveTextContent("4");
  });

  // 15. Approved claims

  it("should correctly count approved claims", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(screen.getByTestId("chart-data-approved")).toHaveTextContent("4");
  });

  // 16. Rejected claims

  it("should correctly count rejected claims", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(screen.getByTestId("chart-data-rejected")).toHaveTextContent("2");
  });

  // 17. All pending

  it("should handle a dataset containing only pending claims", () => {
    const claims = [
      createMockClaim(1, "PENDING"),
      createMockClaim(2, "PENDING"),
      createMockClaim(3, "PENDING"),
    ];

    render(<ClaimsStatusChart claims={claims} />);

    expectChartCounts(3, 0, 0);
  });

  // 18. All approved

  it("should handle a dataset containing only approved claims", () => {
    const claims = [
      createMockClaim(1, "APPROVED"),
      createMockClaim(2, "APPROVED"),
    ];

    render(<ClaimsStatusChart claims={claims} />);

    expectChartCounts(0, 2, 0);
  });

  // 19. All rejected

  it("should handle a dataset containing only rejected claims", () => {
    const claims = [
      createMockClaim(1, "REJECTED"),
      createMockClaim(2, "REJECTED"),
    ];

    render(<ClaimsStatusChart claims={claims} />);

    expectChartCounts(0, 0, 2);
  });

  // 20. Case-insensitive status matching

  it("should count statuses regardless of capitalization", () => {
    const claims = [
      createMockClaim(1, "pending" as Claim["status"]),
      createMockClaim(2, "Pending" as Claim["status"]),
      createMockClaim(3, "approved" as Claim["status"]),
      createMockClaim(4, "Approved" as Claim["status"]),
      createMockClaim(5, "rejected" as Claim["status"]),
      createMockClaim(6, "Rejected" as Claim["status"]),
    ];

    render(<ClaimsStatusChart claims={claims} />);

    expectChartCounts(2, 2, 2);
  });

  // 21. Unsupported statuses

  it("should exclude unsupported claim statuses from the chart counts", () => {
    const claims = [
      createMockClaim(1, "PENDING"),
      createMockClaim(2, "APPROVED"),
      createMockClaim(3, "REJECTED"),
      createMockClaim(4, "UNKNOWN" as Claim["status"]),
    ];

    render(<ClaimsStatusChart claims={claims} />);

    expectChartCounts(1, 1, 1);
  });

  // =====================================
  // COLOR MAPPING TESTS
  // =====================================

  // 22. Chart colors

  it("should assign the correct colors to each claim status", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    const cells = screen.getAllByTestId("chart-cell");

    expect(cells).toHaveLength(3);

    expect(cells[0]).toHaveAttribute("data-fill", "#f59e0b");

    expect(cells[1]).toHaveAttribute("data-fill", "#10b981");

    expect(cells[2]).toHaveAttribute("data-fill", "#ef4444");
  });

  // =====================================
  // TOOLTIP AND LEGEND
  // =====================================

  // 23. Tooltip

  it("should render the chart tooltip", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(screen.getByTestId("chart-tooltip")).toBeInTheDocument();
  });

  // 24. Legend

  it("should render the chart legend", () => {
    render(<ClaimsStatusChart claims={mockClaims} />);

    expect(screen.getByTestId("chart-legend")).toBeInTheDocument();
  });

  // =====================================
  // DYNAMIC DATA UPDATES
  // =====================================

  // 25. Rerender with updated claims

  it("should update the chart when the claims prop changes", () => {
    const { rerender } = render(<ClaimsStatusChart claims={mockClaims} />);

    expectChartCounts(4, 4, 2);

    const updatedClaims = [
      createMockClaim(1, "APPROVED"),
      createMockClaim(2, "APPROVED"),
      createMockClaim(3, "REJECTED"),
    ];

    rerender(<ClaimsStatusChart claims={updatedClaims} />);

    expectChartCounts(0, 2, 1);

    rerender(<ClaimsStatusChart claims={[]} />);

    expect(
      screen.getByText("No claims available for chart."),
    ).toBeInTheDocument();

    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();

    rerender(<ClaimsStatusChart claims={mockClaims} />);

    expectChartCounts(4, 4, 2);
  });
});
