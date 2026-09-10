import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getOrderRequest, cancelOrderRequest } from "../../api/orders.js";
import { getMyReviewedProductsRequest } from "../../api/reviews.js";
import { formatPrice } from "../../utils/formatPrice.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import ReviewForm from "../../components/ReviewForm.jsx";

const TIMELINE_STEPS = ["placed", "confirmed", "processing", "shipped", "delivered"];
const CANCELLABLE = ["placed", "confirmed", "processing"];

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reviewingProductId, setReviewingProductId] = useState(null);
  const [reviewedProductIds, setReviewedProductIds] = useState([]);

  const load = () => {
    getOrderRequest(id)
      .then(({ data }) => {
        const loadedOrder = data.order;
        setOrder(loadedOrder);
        // Pre-populate reviewed products from the DB so the "Write a review"
        // button is hidden correctly even after a hard page reload.
        if (loadedOrder.status === "delivered") {
          getMyReviewedProductsRequest(id)
            .then(({ data: reviewData }) =>
              setReviewedProductIds(reviewData.reviewedProductIds || [])
            )
            .catch(() => {}); // non-critical — silently fail
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
      setOrder(data.order);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <p className="py-24 text-center text-clay">Loading order…</p>;
  if (!order) return <p className="py-24 text-center text-clay">Order not found.</p>;

  const isCancelled = order.status === "cancelled" || order.status === "returned";
  const currentStepIndex = TIMELINE_STEPS.indexOf(order.status);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink sm:text-3xl">{order.orderNumber}</h1>
          <p className="text-sm text-clay">
            Placed {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div className="mt-8 flex items-start gap-0 overflow-x-auto pb-2">
          {TIMELINE_STEPS.map((step, i) => (
            <div key={step} className="flex shrink-0 items-start">
              <div className="flex w-16 shrink-0 flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full ${
                    i <= currentStepIndex ? "bg-thread" : "bg-clay/25"
                  }`}
                />
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
          Tracking number: <span className="text-ink">{order.trackingNumber}</span>
        </p>
      )}

      {/* Items */}
      <div className="mt-8 divide-y divide-clay/15 rounded-xl ring-1 ring-clay/15">
        {order.items.map((item) => {
          // item.product may be a raw ObjectId string or a populated object depending
          // on the API response — always normalise to a plain string for comparisons.
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
                  <p className="text-sm text-clay">
                    Qty {item.quantity} · {formatPrice(item.price)} each
                  </p>
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
                        setReviewedProductIds((prev) => [...prev, itemProductId]);
                        setReviewingProductId(null);
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setReviewingProductId(itemProductId)}
                      className="text-sm text-thread hover:underline"
                    >
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

      {/* Address & summary */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-lg text-ink">Shipping address</h2>
          <p className="mt-2 text-sm text-clay">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.phone}
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg text-ink">Payment</h2>
          <p className="mt-2 text-sm text-clay">
            Method: {order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}
            <br />
            Status: <span className="capitalize">{order.paymentStatus}</span>
          </p>

          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-ink">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-moss">
                <span>Discount</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink">
              <span>Shipping</span>
              <span>{order.shippingFee === 0 ? "Free" : formatPrice(order.shippingFee)}</span>
            </div>
            <div className="flex justify-between border-t border-clay/20 pt-1 font-medium text-ink">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

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
