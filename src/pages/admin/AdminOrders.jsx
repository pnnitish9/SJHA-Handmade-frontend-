import { useEffect, useState } from "react";
import { getAllOrdersRequest, updateOrderStatusRequest } from "../../api/orders.js";
import { adminVerifyPaymentRequest, adminRejectPaymentRequest } from "../../api/payments.js";
import { formatPrice } from "../../utils/formatPrice.js";
import StatusBadge from "../../components/StatusBadge.jsx";

const STATUS_OPTIONS = [
  "placed", "confirmed", "processing", "shipped", "delivered",
  "payment_failed", "cancelled", "returned",
];

// Format an ISO date string as DD/MM/YYYY
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export default function AdminOrders() {
  const [orders, setOrders]           = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState(null);
  const [trackingDrafts, setTrackingDrafts] = useState({});
  const [savingId, setSavingId]       = useState(null);

  // Per-order reject reason draft
  const [rejectDrafts, setRejectDrafts] = useState({});
  const [showRejectInput, setShowRejectInput] = useState({}); // { [orderId]: bool }

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

  const handleVerify = async (order) => {
    if (!order.paymentRef?._id) return;
    if (!window.confirm("Confirm payment verified? This will confirm the order.")) return;
    setSavingId(order._id);
    try {
      await adminVerifyPaymentRequest(order.paymentRef._id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Verification failed.");
    } finally {
      setSavingId(null);
    }
  };

  const handleReject = async (order) => {
    const reason = rejectDrafts[order._id]?.trim();
    if (!reason) {
      alert("Please enter a rejection reason.");
      return;
    }
    setSavingId(order._id);
    try {
      await adminRejectPaymentRequest(order.paymentRef._id, reason);
      setShowRejectInput((s) => ({ ...s, [order._id]: false }));
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Rejection failed.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      {/* Header + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-ink">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-clay/30 bg-cream px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="payment_verification">Payment verification</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1).replace(/_/g, " ")}
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
          {orders.map((order) => {
            const payment = order.paymentRef; // populated by backend
            const isPendingVerification = order.status === "payment_verification";

            return (
              <div
                key={order._id}
                className={`rounded-xl p-4 ring-1 sm:p-5 ${
                  isPendingVerification
                    ? "bg-amber-50 ring-amber-200"
                    : "bg-cream ring-clay/15"
                }`}
              >
                {/* Collapsed row */}
                <button
                  onClick={() =>
                    setExpandedId(expandedId === order._id ? null : order._id)
                  }
                  className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{order.orderNumber}</p>
                    <p className="text-xs text-clay">
                      {order.user?.name} · {order.user?.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink">
                      {formatPrice(order.total)}
                    </span>
                    <StatusBadge status={order.status} />
                    {isPendingVerification && (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Needs verification
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded panel */}
                {expandedId === order._id && (
                  <div className="mt-4 space-y-5 border-t border-clay/20 pt-5">

                    {/* Items */}
                    <ul className="space-y-1 text-sm text-clay">
                      {order.items.map((item) => (
                        <li key={item._id}>
                          {item.name} × {item.quantity} —{" "}
                          {formatPrice(item.price * item.quantity)}
                        </li>
                      ))}
                    </ul>

                    {/* ── Payment Proof block ── */}
                    {payment && (
                      <div className="rounded-xl bg-oat p-4 ring-1 ring-clay/15">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-clay">
                          Payment Proof
                        </p>

                        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                          <Row label="Payer Name"   value={payment.payerName    || "—"} />
                          <Row label="UTR / Txn ID" value={payment.transactionId || "—"} mono />
                          <Row label="Mode / Bank"  value={payment.bankName     || "—"} />
                          <Row label="Phone"        value={payment.payerPhone   || "—"} />
                          <Row label="Date"         value={fmtDate(payment.paymentDate)} />
                          <Row label="Time"         value={payment.paymentTime  || "—"} />
                          <Row label="Amount"       value={formatPrice(payment.amount)} />
                          <Row label="Status">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                payment.status === "verified"
                                  ? "bg-moss/10 text-moss"
                                  : payment.status === "rejected"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {payment.status === "verification_pending"
                                ? "Pending"
                                : payment.status}
                            </span>
                          </Row>
                          {payment.screenshot?.url && (
                            <div className="sm:col-span-2">
                              <span className="text-clay">Screenshot</span>
                              <a
                                href={payment.screenshot.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-xs text-thread underline"
                              >
                                View
                              </a>
                            </div>
                          )}
                          {payment.rejectionReason && (
                            <div className="sm:col-span-2">
                              <Row label="Rejection reason" value={payment.rejectionReason} />
                            </div>
                          )}
                        </div>

                        {/* Verify / Reject actions — only while pending */}
                        {payment.status === "verification_pending" && (
                          <div className="mt-4 space-y-3">
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={() => handleVerify(order)}
                                disabled={savingId === order._id}
                                className="rounded-full bg-moss px-5 py-2 text-sm text-cream hover:bg-moss/90 disabled:opacity-60"
                              >
                                {savingId === order._id ? "Saving…" : "✓ Verify Payment"}
                              </button>
                              <button
                                onClick={() =>
                                  setShowRejectInput((s) => ({
                                    ...s,
                                    [order._id]: !s[order._id],
                                  }))
                                }
                                className="rounded-full border border-red-300 bg-red-50 px-5 py-2 text-sm text-red-700 hover:bg-red-100"
                              >
                                ✕ Reject Payment
                              </button>
                            </div>

                            {showRejectInput[order._id] && (
                              <div className="flex gap-2">
                                <input
                                  value={rejectDrafts[order._id] || ""}
                                  onChange={(e) =>
                                    setRejectDrafts((d) => ({
                                      ...d,
                                      [order._id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Rejection reason…"
                                  className="flex-1 rounded-lg border border-clay/30 bg-cream px-3 py-2 text-sm focus:border-thread focus:outline-none"
                                />
                                <button
                                  onClick={() => handleReject(order)}
                                  disabled={savingId === order._id}
                                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  Confirm
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status + tracking */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="flex-1 text-sm text-ink/80">
                        Status
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order._id, e.target.value)
                          }
                          disabled={savingId === order._id}
                          className="mt-1 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s[0].toUpperCase() + s.slice(1).replace(/_/g, " ")}
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
                              setTrackingDrafts((prev) => ({
                                ...prev,
                                [order._id]: e.target.value,
                              }))
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

                    {/* Status history */}
                    {order.statusHistory?.length > 0 && (
                      <div className="text-xs text-clay">
                        <p className="mb-1 font-medium text-ink/70">Status history</p>
                        {order.statusHistory.map((h, i) => (
                          <p key={i}>
                            {new Date(h.changedAt).toLocaleString()} —{" "}
                            <span className="capitalize">{h.status.replace(/_/g, " ")}</span>
                            {h.note ? ` (${h.note})` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Small label/value row helper
function Row({ label, value, mono = false, children }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-clay">{label}</span>
      {children ?? (
        <span className={`text-right text-ink ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
