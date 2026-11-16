import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import type { Policy } from "../types/Policy";

type PolicyStatusChartProps = {
  policies: Policy[];
};

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

function PolicyStatusChart({ policies }: PolicyStatusChartProps) {
  const data = [
    {
      name: "Active",
      value: policies.filter(
        (policy) => policy.status.toUpperCase() === "ACTIVE",
      ).length,
    },
    {
      name: "Expired",
      value: policies.filter(
        (policy) => policy.status.toUpperCase() === "EXPIRED",
      ).length,
    },
    {
      name: "Cancelled",
      value: policies.filter(
        (policy) => policy.status.toUpperCase() === "CANCELLED",
      ).length,
    },
  ];

  if (policies.length === 0) {
    return <p>No policies available for chart.</p>;
  }

  return (
    <div className="claims-chart">
      <h2>Policy Status Distribution</h2>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index]} />
            ))}
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PolicyStatusChart;
