import { useEffect, useState } from "react";
import { getAllOrdersRequest, updateOrderStatusRequest } from "../../api/orders.js";
import { formatPrice } from "../../utils/formatPrice.js";
import StatusBadge from "../../components/StatusBadge.jsx";

const STATUS_OPTIONS = ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [trackingDrafts, setTrackingDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await getAllOrdersRequest(statusFilter ? { status: statusFilter } : {});
    setOrders(data.orders);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleStatusChange = async (orderId, status) => {
    setSavingId(orderId);
    try {
      const { data } = await updateOrderStatusRequest(orderId, { status });
      setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
    } finally {
      setSavingId(null);
    }
  };

  const handleTrackingSave = async (orderId) => {
    setSavingId(orderId);
    try {
      const { data } = await updateOrderStatusRequest(orderId, {
        trackingNumber: trackingDrafts[orderId] ?? "",
      });
      setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-ink">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-clay/30 bg-cream px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-10 text-clay">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-10 text-clay">No orders found.</p>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="rounded-xl bg-cream p-4 ring-1 ring-clay/15 sm:p-5">
              <button
                onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm text-ink">{order.orderNumber}</p>
                  <p className="text-xs text-clay">
                    {order.user?.name} · {order.user?.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-ink">{formatPrice(order.total)}</span>
                  <StatusBadge status={order.status} />
                </div>
              </button>

              {expandedId === order._id && (
                <div className="mt-4 space-y-4 border-t border-clay/20 pt-4">
                  <ul className="space-y-1 text-sm text-clay">
                    {order.items.map((item) => (
                      <li key={item._id}>
                        {item.name} × {item.quantity} — {formatPrice(item.price * item.quantity)}
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex-1 text-sm text-ink/80">
                      Status
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        disabled={savingId === order._id}
                        className="mt-1 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s[0].toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex-1 text-sm text-ink/80">
                      Tracking number
                      <div className="mt-1 flex gap-2">
                        <input
                          value={trackingDrafts[order._id] ?? order.trackingNumber ?? ""}
                          onChange={(e) =>
                            setTrackingDrafts((prev) => ({ ...prev, [order._id]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm"
                        />
                        <button
                          onClick={() => handleTrackingSave(order._id)}
                          disabled={savingId === order._id}
                          className="shrink-0 rounded-lg bg-thread px-4 py-2 text-sm text-cream hover:bg-thread/90 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="text-xs text-clay">
                    <p className="mb-1 font-medium text-ink/70">Status history</p>
                    {order.statusHistory?.map((h, i) => (
                      <p key={i}>
                        {new Date(h.changedAt).toLocaleString()} — {h.status} {h.note ? `(${h.note})` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
