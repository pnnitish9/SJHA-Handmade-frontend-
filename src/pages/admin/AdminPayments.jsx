import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import {
  getPendingPaymentsRequest,
  adminVerifyPaymentRequest,
  adminRejectPaymentRequest,
} from "../../api/payments.js";
import { formatPrice } from "../../utils/formatPrice.js";

const TABS = [
  { key: "pending",  label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
];

// Status pill colours
const STATUS_STYLES = {
  verification_pending: "bg-amber-100 text-amber-800",
  verified:             "bg-moss/10 text-moss",
  rejected:             "bg-red-50 text-red-600",
  failed:               "bg-red-50 text-red-600",
};

function StatusPill({ status }) {
  const label =
    status === "verification_pending" ? "Pending"
    : status === "verified"           ? "Verified"
    : status === "rejected"           ? "Rejected"
    : status;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status] || "bg-clay/10 text-clay"}`}>
      {label}
    </span>
  );
}

export default function AdminPayments() {
  const [tab, setTab]           = useState("pending");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Selected payment for the detail modal
  const [selected, setSelected] = useState(null);

  // Reject modal state
  const [rejectId, setRejectId]         = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError]   = useState("");
  const [rejecting, setRejecting]       = useState(false);

  const [actingId, setActingId] = useState(null); // payment being verified

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getPendingPaymentsRequest(tab);
      setPayments(data.payments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleVerify = async (paymentId) => {
    if (!window.confirm("Confirm: you have checked your UPI/bank account and this payment is genuine?")) return;
    setActingId(paymentId);
    try {
      await adminVerifyPaymentRequest(paymentId);
      await load();
      setSelected(null);
    } catch (err) {
      alert(err.response?.data?.message || "Verification failed.");
    } finally {
      setActingId(null);
    }
  };

  const openRejectModal = (paymentId) => {
    setRejectId(paymentId);
    setRejectReason("");
    setRejectError("");
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError("A rejection reason is required.");
      return;
    }
    setRejecting(true);
    try {
      await adminRejectPaymentRequest(rejectId, rejectReason.trim());
      setRejectId(null);
      setSelected(null);
      await load();
    } catch (err) {
      setRejectError(err.response?.data?.message || "Rejection failed.");
    } finally {
      setRejecting(false);
    }
  };

  // Format a date string or Date object nicely
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Payment Verification</h1>

      {/* ── Tabs ── */}
      <div className="mt-6 flex gap-1 rounded-xl bg-oat p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              tab === t.key ? "bg-cream font-medium text-ink shadow-sm" : "text-clay hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Table / list ── */}
      {loading ? (
        <p className="mt-10 text-clay">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="mt-10 text-clay">No {tab} payments.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-xl ring-1 ring-clay/15 md:block">
            <table className="w-full text-sm">
              <thead className="bg-oat text-left text-xs uppercase tracking-wide text-clay">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">UTR</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-clay/10 bg-cream">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-oat/60">
                    <td className="px-4 py-3 font-medium text-ink">
                      {p.order?.orderNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-clay">
                      <p>{p.user?.name || "—"}</p>
                      <p className="text-xs">{p.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-ink">{formatPrice(p.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-clay">
                      {p.transactionId || "—"}
                    </td>
                    <td className="px-4 py-3 text-clay">{fmt(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(p)}
                        className="rounded-lg border border-clay/30 px-3 py-1.5 text-xs text-ink hover:border-thread"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {payments.map((p) => (
              <div key={p._id} className="rounded-xl bg-cream p-4 ring-1 ring-clay/15">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-ink">{p.order?.orderNumber || "—"}</p>
                    <p className="text-xs text-clay">{p.user?.name} · {p.user?.email}</p>
                  </div>
                  <StatusPill status={p.status} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-ink">{formatPrice(p.amount)}</p>
                  <button
                    onClick={() => setSelected(p)}
                    className="rounded-lg border border-clay/30 px-3 py-1.5 text-xs text-ink hover:border-thread"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Detail modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl bg-cream p-6 shadow-xl">
            {/* Close */}
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-clay hover:bg-oat"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <h2 className="font-display text-xl text-ink">Payment Detail</h2>

            {/* Order info */}
            <div className="mt-4 rounded-xl bg-oat p-4 text-sm">
              <Row label="Order"    value={selected.order?.orderNumber || "—"} />
              <Row label="Customer" value={`${selected.user?.name || "—"} (${selected.user?.email || ""})`} />
              <Row label="Phone"    value={selected.user?.phone || selected.payerPhone || "—"} />
              <Row label="Amount"   value={formatPrice(selected.amount)} />
            </div>

            {/* Payment details */}
            <div className="mt-4 rounded-xl bg-oat p-4 text-sm">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-clay">Payment Details</p>
              <Row label="Payer Name"  value={selected.payerName    || "—"} />
              <Row label="Phone"       value={selected.payerPhone   || "—"} />
              <Row label="UPI App"     value={selected.bankName     || "—"} />
              <Row label="UTR / ID"    value={selected.transactionId || "—"} mono />
              <Row label="Date"        value={fmt(selected.paymentDate)} />
              <Row label="Time"        value={selected.paymentTime  || "—"} />
              <Row label="Status">
                <StatusPill status={selected.status} />
              </Row>
              {selected.rejectionReason && (
                <Row label="Rejection reason" value={selected.rejectionReason} />
              )}
              {selected.verifiedBy?.name && (
                <Row label="Actioned by" value={selected.verifiedBy.name} />
              )}
              {selected.verifiedAt && (
                <Row label="Actioned at" value={new Date(selected.verifiedAt).toLocaleString()} />
              )}
            </div>

            {/* Screenshot */}
            {selected.screenshot?.url && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-clay">
                  Payment Screenshot
                </p>
                <a href={selected.screenshot.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={selected.screenshot.url}
                    alt="Payment screenshot"
                    className="max-h-64 w-full rounded-xl border border-clay/20 object-contain"
                  />
                  <p className="mt-1 flex items-center gap-1 text-xs text-thread hover:underline">
                    <ExternalLink size={11} /> Open full size
                  </p>
                </a>
              </div>
            )}

            {/* Action buttons — only for pending payments */}
            {selected.status === "verification_pending" && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => handleVerify(selected._id)}
                  disabled={actingId === selected._id}
                  className="flex-1 rounded-full bg-moss px-4 py-2.5 text-sm text-cream transition hover:bg-moss/90 disabled:opacity-60"
                >
                  {actingId === selected._id ? "Verifying…" : "✓ Verify Payment"}
                </button>
                <button
                  onClick={() => openRejectModal(selected._id)}
                  className="flex-1 rounded-full border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 transition hover:bg-red-100"
                >
                  ✕ Reject Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject reason modal ── */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-cream p-6 shadow-xl">
            <h3 className="font-display text-lg text-ink">Reject Payment</h3>
            <p className="mt-1 text-sm text-clay">
              Provide a reason. The customer will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Payment amount mismatch, UTR not found in account…"
              className="mt-4 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm focus:border-thread focus:outline-none"
            />
            {rejectError && (
              <p className="mt-1 text-xs text-red-600">{rejectError}</p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setRejectId(null)}
                className="flex-1 rounded-full border border-clay/30 py-2.5 text-sm text-ink hover:border-thread"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {rejecting ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helper for label/value rows inside detail cards ─────────────────────
function Row({ label, value, mono = false, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="shrink-0 text-clay">{label}</span>
      {children ? (
        <span>{children}</span>
      ) : (
        <span className={`text-right text-ink ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
