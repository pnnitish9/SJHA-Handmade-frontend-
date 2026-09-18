import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getOrderRequest, cancelOrderRequest } from "../../api/orders.js";
import { getMyReviewedProductsRequest } from "../../api/reviews.js";
import { formatPrice } from "../../utils/formatPrice.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import ReviewForm from "../../components/ReviewForm.jsx";

// Steps shown in the progress timeline for a confirmed order
const TIMELINE_STEPS = ["placed", "confirmed", "processing", "shipped", "delivered"];

// Steps shown while payment is being verified
const PAYMENT_TIMELINE_STEPS = [
  { key: "order_created",          label: "Order Created" },
  { key: "proof_submitted",        label: "Proof Submitted" },
  { key: "verification_pending",   label: "Pending Verification" },
  { key: "admin_verification",     label: "Admin Verification" },
  { key: "order_confirmed",        label: "Order Confirmed" },
];

// For a payment_verification order the furthest reached step index is 2
function paymentTimelineIndex(order) {
  if (order.status === "payment_verification") return 2;
  if (["confirmed", "processing", "shipped", "delivered"].includes(order.status)) return 4;
  return 1;
}

const CANCELLABLE = ["placed", "confirmed", "processing"];

// Human-readable label for paymentStatus values
function paymentStatusLabel(paymentStatus) {
  switch (paymentStatus) {
    case "verification_pending": return "Pending Verification";
    case "paid":                 return "Paid";
    case "rejected":             return "Rejected";
    case "failed":               return "Failed";
    case "refunded":             return "Refunded";
    default:                     return paymentStatus ?? "—";
  }
}

export default function OrderDetails() {
  const { id } = useParams();

  const [order, setOrder]     = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling]   = useState(false);
  const [reviewingProductId, setReviewingProductId] = useState(null);
  const [reviewedProductIds, setReviewedProductIds] = useState([]);

  const load = () => {
    getOrderRequest(id)
      .then(({ data }) => {
        setOrder(data.order);
        // paymentRef is populated by the backend (getOrder populates it)
        setPayment(data.order.paymentRef || null);
        if (data.order.status === "delivered") {
          getMyReviewedProductsRequest(id)
            .then(({ data: r }) => setReviewedProductIds(r.reviewedProductIds || []))
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleCancel = async () => {
    if (!window.confirm("Cancel this order?")) return;
    setCancelling(true);
    try {
      const { data } = await cancelOrderRequest(id);
      if (data.deleted) {
        window.location.replace("/orders");
        return;
      }
      setOrder(data.order);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <p className="py-24 text-center text-clay">Loading order…</p>;
  if (!order)  return <p className="py-24 text-center text-clay">Order not found.</p>;

  const isPaymentPending      = order.status === "payment_pending";
  const isPaymentVerification = order.status === "payment_verification";
  const isPaymentFailed       = order.status === "payment_failed";
  const isCancelled           = order.status === "cancelled" || order.status === "returned";
  const isActive              = !isPaymentPending && !isPaymentVerification && !isPaymentFailed && !isCancelled;
  const currentStepIndex      = TIMELINE_STEPS.indexOf(order.status);

  // rejection reason lives on the payment record
  const rejectionReason = payment?.rejectionReason || null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-12">

      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink sm:text-3xl">{order.orderNumber}</h1>
          <p className="text-sm text-clay">
            Placed {new Date(order.createdAt).toLocaleDateString(undefined, {
              year: "numeric", month: "short", day: "numeric",
            })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* ── Payment-pending banner (no proof submitted yet) ── */}
      {isPaymentPending && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-900">Payment not completed</p>
          <p className="mt-1 text-sm text-amber-800">
            Your order is reserved but you have not submitted payment proof yet.
            Go to checkout to complete your payment.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/checkout"
              className="rounded-full bg-thread px-5 py-2 text-sm text-cream transition hover:bg-thread/90"
            >
              Complete payment
            </Link>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel order"}
            </button>
          </div>
        </div>
      )}

      {/* ── Payment-verification banner (proof submitted, awaiting admin) ── */}
      {isPaymentVerification && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-900">Payment Verification Pending</p>
          <p className="mt-1 text-sm text-amber-800">
            Your payment proof has been submitted. Our team is reviewing it and will confirm
            your order shortly.
          </p>
          {/* UPI proof summary */}
          {payment && (
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-amber-900">
              {payment.transactionId && (
                <>
                  <span className="opacity-70">UTR / Transaction ID</span>
                  <span className="font-medium">{payment.transactionId}</span>
                </>
              )}
              {payment.bankName && (
                <>
                  <span className="opacity-70">UPI App</span>
                  <span className="font-medium">{payment.bankName}</span>
                </>
              )}
              {payment.payerName && (
                <>
                  <span className="opacity-70">Payer</span>
                  <span className="font-medium">{payment.payerName}</span>
                </>
              )}
            </div>
          )}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="mt-4 text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel order"}
          </button>
        </div>
      )}

      {/* ── Payment-failed banner ── */}
      {isPaymentFailed && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">Payment Rejected</p>
          {rejectionReason && (
            <p className="mt-1 text-sm text-red-700">
              <span className="font-medium">Reason:</span> {rejectionReason}
            </p>
          )}
          <p className="mt-2 text-sm text-red-600">
            Your reserved items have been released. Please place a new order and try again,
            or contact us if you believe this is an error.
          </p>
          <Link
            to="/shop"
            className="mt-4 inline-block rounded-full bg-thread px-5 py-2 text-sm text-cream hover:bg-thread/90"
          >
            Shop again
          </Link>
        </div>
      )}

      {/* ── Payment-verification progress timeline ── */}
      {isPaymentVerification && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-clay">
            Order progress
          </p>
          <div className="flex items-start overflow-x-auto pb-2">
            {PAYMENT_TIMELINE_STEPS.map((s, i) => {
              const reached = i <= paymentTimelineIndex(order);
              return (
                <div key={s.key} className="flex shrink-0 items-start">
                  <div className="flex w-24 shrink-0 flex-col items-center sm:w-28">
                    <div className={`h-3 w-3 rounded-full ${reached ? "bg-thread" : "bg-clay/25"}`} />
                    <span className={`mt-1.5 whitespace-nowrap text-center text-xs ${reached ? "text-ink" : "text-clay/60"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < PAYMENT_TIMELINE_STEPS.length - 1 && (
                    <div className={`mt-1.5 h-0.5 w-6 shrink-0 sm:w-10 ${i < paymentTimelineIndex(order) ? "bg-thread" : "bg-clay/25"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Normal order progress timeline ── */}
      {isActive && (
        <div className="mt-8 flex items-start overflow-x-auto pb-2">
          {TIMELINE_STEPS.map((step, i) => (
            <div key={step} className="flex shrink-0 items-start">
              <div className="flex w-16 shrink-0 flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${i <= currentStepIndex ? "bg-thread" : "bg-clay/25"}`} />
                <span className={`mt-1.5 whitespace-nowrap text-xs capitalize ${i <= currentStepIndex ? "text-ink" : "text-clay/60"}`}>
                  {step}
                </span>
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`mt-1.5 h-0.5 w-8 shrink-0 sm:w-14 ${i < currentStepIndex ? "bg-thread" : "bg-clay/25"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {order.trackingNumber && (
        <p className="mt-4 text-sm text-clay">
          Tracking: <span className="text-ink">{order.trackingNumber}</span>
        </p>
      )}

      {/* ── Items ── */}
      <div className="mt-8 divide-y divide-clay/15 rounded-xl ring-1 ring-clay/15">
        {order.items.map((item) => {
          const itemProductId = item.product?._id?.toString() ?? item.product?.toString();
          const alreadyReviewed = reviewedProductIds.includes(itemProductId);
          return (
            <div key={item._id} className="p-4 sm:p-5">
              <div className="flex gap-4">
                {item.image && (
                  <img src={item.image} alt={item.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <p className="text-ink">{item.name}</p>
                  <p className="text-sm text-clay">Qty {item.quantity} · {formatPrice(item.price)} each</p>
                </div>
                <p className="text-sm font-medium text-ink">{formatPrice(item.price * item.quantity)}</p>
              </div>

              {order.status === "delivered" && !alreadyReviewed && (
                <div className="mt-3">
                  {reviewingProductId === itemProductId ? (
                    <ReviewForm
                      orderId={order._id}
                      productId={itemProductId}
                      onSubmitted={() => {
                        setReviewedProductIds((p) => [...p, itemProductId]);
                        setReviewingProductId(null);
                      }}
                    />
                  ) : (
                    <button onClick={() => setReviewingProductId(itemProductId)} className="text-sm text-thread hover:underline">
                      Write a review
                    </button>
                  )}
                </div>
              )}
              {alreadyReviewed && <p className="mt-2 text-sm text-moss">Thanks for your review!</p>}
            </div>
          );
        })}
      </div>

      {/* ── Address & payment summary ── */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-lg text-ink">Shipping address</h2>
          <p className="mt-2 text-sm text-clay">
            {order.shippingAddress.fullName}<br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}<br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
            {order.shippingAddress.phone}
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg text-ink">Payment</h2>
          <p className="mt-2 text-sm text-clay">
            Method:{" "}
            {order.paymentMethod === "upi_manual"
              ? "UPI Manual"
              : order.paymentMethod === "cod"
              ? "Cash on delivery"
              : "Paid online"}
            <br />
            Status: <span className="capitalize">{paymentStatusLabel(order.paymentStatus)}</span>
          </p>

          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-ink">
              <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-moss">
                <span>Discount</span><span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink">
              <span>Shipping</span>
              <span>{order.shippingFee === 0 ? "Free" : formatPrice(order.shippingFee)}</span>
            </div>
            <div className="flex justify-between border-t border-clay/20 pt-1 font-medium text-ink">
              <span>Total</span><span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status history (collapsible) ── */}
      {order.statusHistory?.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-clay hover:text-ink">
            View status history
          </summary>
          <div className="mt-3 space-y-1 text-xs text-clay">
            {order.statusHistory.map((h, i) => (
              <p key={i}>
                {new Date(h.changedAt).toLocaleString()} —{" "}
                <span className="capitalize">{h.status}</span>
                {h.note ? ` (${h.note})` : ""}
              </p>
            ))}
          </div>
        </details>
      )}

      {/* ── Actions ── */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/orders" className="text-sm text-clay hover:text-ink">
          ← Back to orders
        </Link>
        {CANCELLABLE.includes(order.status) && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel order"}
          </button>
        )}
      </div>
    </div>
  );
}
