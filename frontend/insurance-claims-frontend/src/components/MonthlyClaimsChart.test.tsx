import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "@testing-library/react";

import type { ReactNode } from "react";
import type { Claim } from "../types/Claim";

import MonthlyClaimsChart from "./MonthlyClaimsChart";

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

  LineChart: ({
    children,
    data,
    margin,
  }: {
    children: ReactNode;
    data: { month: string; count: number }[];
    margin: {
      top: number;
      right: number;
      left: number;
      bottom: number;
    };
  }) => (
    <div data-testid="line-chart" data-margin={JSON.stringify(margin)}>
      {data.map((entry) => (
        <div
          key={entry.month}
          data-testid="chart-data"
          data-month={entry.month}
          data-count={entry.count}
        >
          {entry.month}: {entry.count}
        </div>
      ))}

      {children}
    </div>
  ),

  CartesianGrid: ({ strokeDasharray }: { strokeDasharray: string }) => (
    <div data-testid="cartesian-grid" data-stroke-dasharray={strokeDasharray} />
  ),

  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-datakey={dataKey} />
  ),

  YAxis: ({ allowDecimals }: { allowDecimals: boolean }) => (
    <div data-testid="y-axis" data-allow-decimals={String(allowDecimals)} />
  ),

  Tooltip: () => <div data-testid="chart-tooltip" />,

  Line: ({
    type,
    dataKey,
    name,
    stroke,
    strokeWidth,
    dot,
    activeDot,
  }: {
    type: string;
    dataKey: string;
    name: string;
    stroke: string;
    strokeWidth: number;
    dot: { r: number };
    activeDot: { r: number };
  }) => (
    <div
      data-testid="chart-line"
      data-type={type}
      data-datakey={dataKey}
      data-name={name}
      data-stroke={stroke}
      data-stroke-width={strokeWidth}
      data-dot-radius={dot.r}
      data-active-dot-radius={activeDot.r}
    />
  ),
}));

// =====================================
// MOCK DATA
// =====================================

function createMockClaim(
  id: number,
  claimDate: string,
  status: Claim["status"] = "PENDING",
): Claim {
  return {
    id,
    claimNumber: `CLM-${String(id).padStart(3, "0")}`,
    claimAmount: 1800,
    claimDate,
    description: "Medical expense claim",
    status,
    policyId: 1,
  };
}

const mockClaims: Claim[] = [
  createMockClaim(1, "2026-01-10"),
  createMockClaim(2, "2026-01-20"),
  createMockClaim(3, "2026-02-15"),
  createMockClaim(4, "2026-03-05"),
  createMockClaim(5, "2026-03-12"),
  createMockClaim(6, "2026-03-25"),
  createMockClaim(7, "2026-04-10"),
  createMockClaim(8, "2026-04-18"),
];

const expectedChartData = [
  { month: "2026-01", count: 2 },
  { month: "2026-02", count: 1 },
  { month: "2026-03", count: 3 },
  { month: "2026-04", count: 2 },
];

// =====================================
// HELPER FUNCTIONS
// =====================================

function renderChart(claims: Claim[] = mockClaims) {
  return render(<MonthlyClaimsChart claims={claims} />);
}

function getChartData() {
  return screen.queryAllByTestId("chart-data").map((element) => ({
    month: element.getAttribute("data-month"),
    count: Number(element.getAttribute("data-count")),
  }));
}

// =====================================
// MONTHLY CLAIMS CHART TESTS
// =====================================

describe("MonthlyClaimsChart Component", () => {
  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Heading

  it("should render the Monthly Claims Trend heading", () => {
    renderChart();

    expect(
      screen.getByRole("heading", {
        name: "Monthly Claims Trend",
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  // 2. Chart container

  it("should render the correct chart container", () => {
    const { container } = renderChart();

    expect(
      container.querySelector(".monthly-claims-chart"),
    ).toBeInTheDocument();
  });

  // 3. Responsive container

  it("should render the responsive container", () => {
    renderChart();

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  // 4. LineChart

  it("should render the LineChart inside the responsive container", () => {
    renderChart();

    const responsiveContainer = screen.getByTestId("responsive-container");

    expect(
      within(responsiveContainer).getByTestId("line-chart"),
    ).toBeInTheDocument();
  });

  // 5. Line component

  it("should render the Line component inside the LineChart", () => {
    renderChart();

    const chart = screen.getByTestId("line-chart");

    expect(within(chart).getByTestId("chart-line")).toBeInTheDocument();
  });

  // =====================================
  // EMPTY STATE TESTS
  // =====================================

  // 6. Empty data message

  it("should display a message when no claims exist", () => {
    renderChart([]);

    expect(screen.getByText("No claims data available.")).toBeInTheDocument();
  });

  // 7. Hide chart for empty data

  it("should not render chart components when claims are empty", () => {
    renderChart([]);

    expect(
      screen.queryByTestId("responsive-container"),
    ).not.toBeInTheDocument();

    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();

    expect(screen.queryByTestId("chart-line")).not.toBeInTheDocument();
  });

  // 8. Heading remains visible

  it("should retain the chart heading when claims are empty", () => {
    renderChart([]);

    expect(
      screen.getByRole("heading", {
        name: "Monthly Claims Trend",
      }),
    ).toBeInTheDocument();
  });

  // 9. Hide empty state

  it("should not display the empty message when claims exist", () => {
    renderChart();

    expect(
      screen.queryByText("No claims data available."),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // DATA AGGREGATION TESTS
  // =====================================

  // 10. Aggregate monthly counts

  it("should correctly aggregate claims by month", () => {
    renderChart();

    expect(getChartData()).toEqual(expectedChartData);
  });

  // 11. Single claim

  it("should handle a dataset containing one claim", () => {
    renderChart([createMockClaim(1, "2026-11-15")]);

    expect(getChartData()).toEqual([{ month: "2026-11", count: 1 }]);
  });

  // 12. All claims in one month

  it("should combine claims belonging to the same month", () => {
    renderChart([
      createMockClaim(1, "2026-11-01"),
      createMockClaim(2, "2026-11-10"),
      createMockClaim(3, "2026-11-15"),
      createMockClaim(4, "2026-11-25"),
    ]);

    expect(getChartData()).toEqual([{ month: "2026-11", count: 4 }]);
  });

  // 13. Claims on the same date

  it("should count multiple claims occurring on the same date", () => {
    renderChart([
      createMockClaim(1, "2026-11-10"),
      createMockClaim(2, "2026-11-10"),
      createMockClaim(3, "2026-11-10"),
    ]);

    expect(getChartData()).toEqual([{ month: "2026-11", count: 3 }]);
  });

  // 14. Different claim statuses

  it("should aggregate claims regardless of their status", () => {
    renderChart([
      createMockClaim(1, "2026-11-01", "PENDING"),
      createMockClaim(2, "2026-11-05", "APPROVED"),
      createMockClaim(3, "2026-11-10", "REJECTED"),
    ]);

    expect(getChartData()).toEqual([{ month: "2026-11", count: 3 }]);
  });

  // 15. Claim amounts do not affect counts

  it("should count claim records instead of summing claim amounts", () => {
    renderChart([
      {
        ...createMockClaim(1, "2026-11-01"),
        claimAmount: 1000,
      },
      {
        ...createMockClaim(2, "2026-11-05"),
        claimAmount: 5000,
      },
    ]);

    expect(getChartData()).toEqual([{ month: "2026-11", count: 2 }]);
  });

  // 16. Total claim count

  it("should preserve the total number of claims during aggregation", () => {
    renderChart();

    const total = getChartData().reduce((sum, entry) => sum + entry.count, 0);

    expect(total).toBe(mockClaims.length);
  });

  // =====================================
  // DATE AND SORTING TESTS
  // =====================================

  // 17. Unsorted claims

  it("should sort monthly data chronologically regardless of input order", () => {
    renderChart([
      createMockClaim(1, "2026-12-01"),
      createMockClaim(2, "2026-03-10"),
      createMockClaim(3, "2026-01-15"),
      createMockClaim(4, "2026-02-20"),
    ]);

    expect(getChartData()).toEqual([
      { month: "2026-01", count: 1 },
      { month: "2026-02", count: 1 },
      { month: "2026-03", count: 1 },
      { month: "2026-12", count: 1 },
    ]);
  });

  // 18. Year boundaries

  it("should correctly sort claims across different years", () => {
    renderChart([
      createMockClaim(1, "2027-01-10"),
      createMockClaim(2, "2025-12-15"),
      createMockClaim(3, "2026-12-20"),
      createMockClaim(4, "2026-01-01"),
    ]);

    expect(getChartData()).toEqual([
      { month: "2025-12", count: 1 },
      { month: "2026-01", count: 1 },
      { month: "2026-12", count: 1 },
      { month: "2027-01", count: 1 },
    ]);
  });

  // 19. Same month in different years

  it("should keep identical months from different years separate", () => {
    renderChart([
      createMockClaim(1, "2025-11-10"),
      createMockClaim(2, "2026-11-10"),
      createMockClaim(3, "2026-11-15"),
      createMockClaim(4, "2027-11-10"),
    ]);

    expect(getChartData()).toEqual([
      { month: "2025-11", count: 1 },
      { month: "2026-11", count: 2 },
      { month: "2027-11", count: 1 },
    ]);
  });

  // 20. Missing months

  it("should omit months that do not contain claims", () => {
    renderChart([
      createMockClaim(1, "2026-01-10"),
      createMockClaim(2, "2026-04-15"),
    ]);

    expect(getChartData()).toEqual([
      { month: "2026-01", count: 1 },
      { month: "2026-04", count: 1 },
    ]);
  });

  // 21. Month boundaries

  it("should correctly group claims at month boundaries", () => {
    renderChart([
      createMockClaim(1, "2026-01-31"),
      createMockClaim(2, "2026-02-01"),
      createMockClaim(3, "2026-02-28"),
      createMockClaim(4, "2026-03-01"),
    ]);

    expect(getChartData()).toEqual([
      { month: "2026-01", count: 1 },
      { month: "2026-02", count: 2 },
      { month: "2026-03", count: 1 },
    ]);
  });

  // =====================================
  // CHART CONFIGURATION TESTS
  // =====================================

  // 22. Responsive dimensions

  it("should configure the responsive container dimensions correctly", () => {
    renderChart();

    const container = screen.getByTestId("responsive-container");

    expect(container).toHaveAttribute("data-width", "100%");

    expect(container).toHaveAttribute("data-height", "300");
  });

  // 23. Chart margins

  it("should configure the correct chart margins", () => {
    renderChart();

    const chart = screen.getByTestId("line-chart");

    expect(JSON.parse(chart.getAttribute("data-margin")!)).toEqual({
      top: 10,
      right: 20,
      left: 0,
      bottom: 10,
    });
  });

  // 24. Cartesian grid

  it("should render the CartesianGrid with dashed lines", () => {
    renderChart();

    expect(screen.getByTestId("cartesian-grid")).toHaveAttribute(
      "data-stroke-dasharray",
      "3 3",
    );
  });

  // 25. X-axis

  it("should configure the X-axis to display months", () => {
    renderChart();

    expect(screen.getByTestId("x-axis")).toHaveAttribute(
      "data-datakey",
      "month",
    );
  });

  // 26. Y-axis

  it("should configure the Y-axis to display whole numbers", () => {
    renderChart();

    expect(screen.getByTestId("y-axis")).toHaveAttribute(
      "data-allow-decimals",
      "false",
    );
  });

  // 27. Tooltip

  it("should render the chart tooltip", () => {
    renderChart();

    expect(screen.getByTestId("chart-tooltip")).toBeInTheDocument();
  });

  // 28. Line configuration

  it("should configure the line type, data key, name, color, and width", () => {
    renderChart();

    const line = screen.getByTestId("chart-line");

    expect(line).toHaveAttribute("data-type", "monotone");

    expect(line).toHaveAttribute("data-datakey", "count");

    expect(line).toHaveAttribute("data-name", "Claims");

    expect(line).toHaveAttribute("data-stroke", "#2563eb");

    expect(line).toHaveAttribute("data-stroke-width", "3");
  });

  // 29. Dot configuration

  it("should configure normal and active chart dots correctly", () => {
    renderChart();

    const line = screen.getByTestId("chart-line");

    expect(line).toHaveAttribute("data-dot-radius", "5");

    expect(line).toHaveAttribute("data-active-dot-radius", "7");
  });

  // =====================================
  // DYNAMIC DATA UPDATES
  // =====================================

  // 30. Rerender

  it("should update the monthly trend when the claims prop changes", () => {
    const { rerender } = renderChart();

    expect(getChartData()).toEqual(expectedChartData);

    const updatedClaims = [
      createMockClaim(1, "2026-10-01"),
      createMockClaim(2, "2026-10-10"),
      createMockClaim(3, "2026-11-05"),
    ];

    rerender(<MonthlyClaimsChart claims={updatedClaims} />);

    expect(getChartData()).toEqual([
      { month: "2026-10", count: 2 },
      { month: "2026-11", count: 1 },
    ]);

    rerender(<MonthlyClaimsChart claims={[]} />);

    expect(screen.getByText("No claims data available.")).toBeInTheDocument();

    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();

    rerender(<MonthlyClaimsChart claims={mockClaims} />);

    expect(getChartData()).toEqual(expectedChartData);
  });
});
