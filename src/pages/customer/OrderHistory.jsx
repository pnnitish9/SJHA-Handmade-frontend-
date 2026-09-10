import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrdersRequest } from "../../api/orders.js";
import { formatPrice } from "../../utils/formatPrice.js";
import StatusBadge from "../../components/StatusBadge.jsx";

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrdersRequest()
      .then(({ data }) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-24 text-center text-clay">Loading your orders…</p>;

  if (!orders.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-ink">No orders yet</h1>
        <p className="mt-3 text-clay">When you place an order, it'll show up here.</p>
        <Link to="/shop" className="mt-6 inline-block rounded-full bg-thread px-6 py-3 text-cream hover:bg-thread/90">
          Go to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-12">
      <h1 className="font-display text-3xl text-ink">Your orders</h1>

      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <Link
            key={order._id}
            to={`/orders/${order._id}`}
            className="block rounded-xl bg-cream p-4 ring-1 ring-clay/15 transition hover:ring-thread sm:p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-ink">{order.orderNumber}</p>
                <p className="text-xs text-clay">
                  {new Date(order.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {order.items.length} item(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-ink">{formatPrice(order.total)}</span>
                <StatusBadge status={order.status} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
