import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import type { Claim } from "../types/Claim";

type ClaimsStatusChartProps = {
  claims: Claim[];
};

const COLORS = ["#f59e0b", "#10b981", "#ef4444"];

function ClaimsStatusChart({ claims }: ClaimsStatusChartProps) {
  const data = [
    {
      name: "Pending",
      value: claims.filter((claim) => claim.status.toUpperCase() === "PENDING")
        .length,
    },
    {
      name: "Approved",
      value: claims.filter((claim) => claim.status.toUpperCase() === "APPROVED")
        .length,
    },
    {
      name: "Rejected",
      value: claims.filter((claim) => claim.status.toUpperCase() === "REJECTED")
        .length,
    },
  ];

  if (claims.length === 0) {
    return <p>No claims available for chart.</p>;
  }

  return (
    <div className="claims-chart">
      <h2>Claims Status Distribution</h2>

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

export default ClaimsStatusChart;
