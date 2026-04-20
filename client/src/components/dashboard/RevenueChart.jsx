import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart } from "recharts";
import { formatCurrency } from "../../utils/formatCurrency";

export default function RevenueChart({ data = [] }) {
  return (
    <div className="section-card p-5">
      <h3 className="font-heading text-2xl">Revenue Trend</h3>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid stroke="#E8D5BC" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" tickFormatter={(value) => `₹${value / 1000}k`} />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip formatter={(value, name) => (name === "revenue" ? formatCurrency(value) : value)} />
            <Bar yAxisId="left" dataKey="revenue" fill="#C8440A" radius={[8, 8, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#7B1F1F" strokeWidth={3} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

