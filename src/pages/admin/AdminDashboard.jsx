import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { AlertTriangle } from "lucide-react";
import { getAnalyticsRequest } from "../../api/analytics.js";
import { formatPrice } from "../../utils/formatPrice.js";
import StatusBadge from "../../components/StatusBadge.jsx";

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-cream p-4 ring-1 ring-clay/15 sm:p-5">
      <p className="text-xs text-clay">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-clay">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getAnalyticsRequest().then(({ data }) => setAnalytics(data.analytics));
  }, []);

  if (!analytics) return <p className="text-clay">Loading dashboard…</p>;

  const { revenue, orders, customers, inventory, recentOrders, topProducts, salesTrend } = analytics;

  const chartData = salesTrend.map((d) => ({
    date: new Date(d._id).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    revenue: d.revenue,
  }));

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Dashboard</h1>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Total revenue" value={formatPrice(revenue.total)} />
        <StatCard label="This month" value={formatPrice(revenue.thisMonth)} />
        <StatCard label="Total orders" value={orders.total} />
        <StatCard label="Customers" value={customers.total} />
      </div>

      {/* Sales trend chart */}
      <div className="mt-6 rounded-xl bg-cream p-4 ring-1 ring-clay/15 sm:p-5">
        <p className="text-sm font-medium text-ink">Revenue — last 30 days</p>
        <div className="mt-4 h-56 sm:h-64">
          {chartData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-clay">No paid orders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8A6F5C22" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8A6F5C" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8A6F5C" }} width={40} />
                <Tooltip
                  formatter={(value) => formatPrice(value)}
                  contentStyle={{ background: "#F8F5EE", border: "1px solid #8A6F5C33", borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#B85C38" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Order status breakdown */}
        <div className="rounded-xl bg-cream p-4 ring-1 ring-clay/15 sm:p-5">
          <p className="text-sm font-medium text-ink">Orders by status</p>
          <div className="mt-3 space-y-2">
            {Object.entries(orders.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <StatusBadge status={status} />
                <span className="text-ink">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="rounded-xl bg-cream p-4 ring-1 ring-clay/15 sm:p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-thread" />
            <p className="text-sm font-medium text-ink">Inventory alerts</p>
          </div>
          {inventory.outOfStockCount > 0 && (
            <p className="mt-2 text-xs text-red-600">{inventory.outOfStockCount} product(s) out of stock.</p>
          )}
          <div className="mt-3 space-y-2">
            {inventory.lowStock.length === 0 ? (
              <p className="text-sm text-clay">Everything's well stocked.</p>
            ) : (
              inventory.lowStock.map((p) => (
                <div key={p._id} className="flex items-center justify-between text-sm">
                  <Link to={`/admin/products/${p._id}/edit`} className="text-ink hover:text-thread">
                    {p.name}
                  </Link>
                  <span className="text-clay">{p.stock} left</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top products */}
        <div className="rounded-xl bg-cream p-4 ring-1 ring-clay/15 sm:p-5">
          <p className="text-sm font-medium text-ink">Top products</p>
          <div className="mt-3 space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-sm text-clay">No sales yet.</p>
            ) : (
              topProducts.map((p) => (
                <div key={p._id} className="flex items-center gap-3">
                  {p.image && <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <p className="text-sm text-ink">{p.name}</p>
                    <p className="text-xs text-clay">{p.unitsSold} sold · {formatPrice(p.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-xl bg-cream p-4 ring-1 ring-clay/15 sm:p-5">
          <p className="text-sm font-medium text-ink">Recent orders</p>
          <div className="mt-3 space-y-2">
            {recentOrders.map((order) => (
              <Link
                key={order._id}
                to="/admin/orders"
                className="flex items-center justify-between text-sm hover:text-thread"
              >
                <span className="text-ink">{order.orderNumber}</span>
                <StatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
