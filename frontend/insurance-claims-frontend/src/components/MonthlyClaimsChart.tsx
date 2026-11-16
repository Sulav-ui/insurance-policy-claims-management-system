import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import type { Claim } from "../types/Claim";

type MonthlyClaimsChartProps = {
  claims: Claim[];
};

function MonthlyClaimsChart({ claims }: MonthlyClaimsChartProps) {
  const monthlyCounts: Record<string, number> = {};

  claims.forEach((claim) => {
    const month = claim.claimDate.slice(0, 7);
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  });

  const chartData = Object.entries(monthlyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month,
      count,
    }));

  return (
    <div className="monthly-claims-chart">
      <h2>Monthly Claims Trend</h2>

      {chartData.length === 0 ? (
        <p>No claims data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="month" />

            <YAxis allowDecimals={false} />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="count"
              name="Claims"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default MonthlyClaimsChart;
