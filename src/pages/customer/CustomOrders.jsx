import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, PlusCircle, X, CreditCard, ExternalLink } from "lucide-react";
import {
  createCustomOrderRequest,
  getMyCustomOrdersRequest,
  initiateCustomOrderPaymentRequest,
} from "../../api/customOrders.js";
import { verifyPaymentRequest } from "../../api/payments.js";
import { loadRazorpayScript } from "../../utils/loadRazorpay.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatPrice } from "../../utils/formatPrice.js";
import FormField from "../../components/FormField.jsx";

const STATUS_STYLES = {
  submitted:     "bg-sky-50 text-sky-700 ring-sky-200",
  in_discussion: "bg-amber-50 text-amber-700 ring-amber-200",
  approved:      "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected:      "bg-red-50 text-red-600 ring-red-200",
  converted:     "bg-purple-50 text-purple-700 ring-purple-200",
};

const STATUS_LABELS = {
  submitted:     "Submitted",
  in_discussion: "In Discussion",
  approved:      "Approved — Payment Pending",
  rejected:      "Rejected",
  converted:     "Order Placed ✓",
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || "bg-oat text-ink ring-clay/20";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const EMPTY_FORM = {
  productType: "",
  preferredColor: "",
  preferredSize: "",
  budget: "",
  description: "",
};

export default function CustomOrders() {
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [requests, setRequests]         = useState([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [expandedId, setExpandedId]     = useState(null);

  const [form, setForm]                 = useState(EMPTY_FORM);
  const [files, setFiles]               = useState([]);
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState("");
  const [success, setSuccess]           = useState(false);

  const [payingId, setPayingId]         = useState(null); // custom order id currently going through payment
  const [payError, setPayError]         = useState({});   // { [customOrderId]: message }

  const loadRequests = () => {
    setLoadingList(true);
    getMyCustomOrdersRequest()
      .then(({ data }) => setRequests(data.customOrders))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };

  useEffect(loadRequests, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.productType.trim() || !form.description.trim()) {
      setFormError("Please fill in what you'd like made and a description.");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([key, val]) => val && fd.append(key, val));
    files.forEach((file) => fd.append("referenceImages", file));

    setSubmitting(true);
    try {
      await createCustomOrderRequest(fd);
      setForm(EMPTY_FORM);
      setFiles([]);
      setShowForm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      loadRequests();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not submit your request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async (req) => {
    setPayError((prev) => ({ ...prev, [req._id]: "" }));
    setPayingId(req._id);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPayError((prev) => ({ ...prev, [req._id]: "Could not load payment gateway. Please try again." }));
        return;
      }

      const { data } = await initiateCustomOrderPaymentRequest(req._id);
      const { order, razorpay: rzp } = data;

      const options = {
        key: rzp.keyId,
        amount: rzp.amount,
        currency: rzp.currency,
        name: "handmade_s.jha",
        description: `Custom order — ${req.productType}`,
        order_id: rzp.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: { color: "#B85C38" },
        handler: async (response) => {
          try {
            await verifyPaymentRequest({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order._id,
            });
          } finally {
            // Payment done (or verify failed server-side) — send to order tracking
            navigate(`/orders/${order._id}`);
          }
        },
        modal: {
          ondismiss: () => {
            // Customer closed the modal — order exists with paymentStatus "pending"
            // Reload so the card reflects the convertedOrder link
            loadRequests();
            setPayingId(null);
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
    } catch (err) {
      setPayError((prev) => ({
        ...prev,
        [req._id]: err.response?.data?.message || "Could not initiate payment.",
      }));
      setPayingId(null);
    }
  };

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-12">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Custom orders</h1>
          <p className="mt-1 text-sm text-clay">
            Describe what you'd like made — we'll review and get back to you.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setFormError(""); }}
            className="flex items-center gap-2 rounded-full bg-thread px-5 py-2 text-sm text-cream hover:bg-thread/90"
          >
            <PlusCircle size={15} />
            New request
          </button>
        )}
      </div>

      {/* Success toast */}
      {success && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <p className="text-sm text-emerald-700">
            ✓ Request submitted! We'll review it and get back to you soon.
          </p>
        </div>
      )}

      {/* New request form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-xl bg-cream p-5 ring-1 ring-clay/15"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">New custom request</h2>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="text-clay hover:text-ink"
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>

          <FormField
            label="What would you like made? *"
            name="productType"
            value={form.productType}
            onChange={handleChange}
            placeholder="e.g. Crochet tote bag, macramé wall hanging"
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Preferred colour"
              name="preferredColor"
              value={form.preferredColor}
              onChange={handleChange}
              placeholder="e.g. Sage green"
            />
            <FormField
              label="Preferred size"
              name="preferredSize"
              value={form.preferredSize}
              onChange={handleChange}
              placeholder="e.g. Medium, 30×40 cm"
            />
          </div>
          <FormField
            label="Budget (₹, optional)"
            type="number"
            name="budget"
            value={form.budget}
            onChange={handleChange}
            min="0"
            placeholder="e.g. 800"
          />
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink/80">
              Description *{" "}
              <span className="text-clay">(materials, style, occasion, anything helpful)</span>
            </span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              required
              placeholder="Tell us as much as you can — colours, textures, how you'll use it, any inspiration…"
              className="w-full rounded-lg border border-clay/30 bg-oat px-4 py-2.5 text-sm text-ink placeholder:text-clay/50 focus:border-thread focus:outline-none"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-sm text-ink/80">
              Reference images{" "}
              <span className="text-clay">(optional, up to 4)</span>
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 4))}
              className="text-sm text-clay"
            />
            {files.length > 0 && (
              <p className="mt-1 text-xs text-clay">
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-thread px-5 py-2 text-sm text-cream hover:bg-thread/90 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="text-sm text-clay hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Requests list */}
      <div className="mt-10">
        <h2 className="font-display text-xl text-ink">Your requests</h2>

        {loadingList ? (
          <p className="mt-6 text-clay">Loading…</p>
        ) : requests.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-clay/30 py-12 text-center">
            <p className="text-clay">No requests yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-thread hover:underline"
            >
              Submit your first custom request →
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {requests.map((req) => {
              const isExpanded  = expandedId === req._id;
              const isPaying    = payingId === req._id;
              const thisPayErr  = payError[req._id];
              const needsPayment = req.status === "approved" && !req.convertedOrder;
              const isPaid       = req.status === "converted" && req.convertedOrder;

              return (
                <div
                  key={req._id}
                  className={`overflow-hidden rounded-xl ring-1 ${
                    needsPayment
                      ? "bg-emerald-50 ring-emerald-200"
                      : "bg-cream ring-clay/15"
                  }`}
                >
                  {/* Summary row */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(req._id)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                  >
                    <div className="flex flex-1 items-center gap-3 min-w-0">
                      <StatusBadge status={req.status} />
                      <p className="truncate text-sm font-medium text-ink">{req.productType}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-clay">
                      <span>
                        {new Date(req.createdAt).toLocaleDateString(undefined, {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-clay/15 px-4 pb-5 pt-4 sm:px-5">
                      <p className="text-sm text-clay">{req.description}</p>

                      {(req.preferredColor || req.preferredSize || req.budget) && (
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                          {req.preferredColor && (
                            <div>
                              <dt className="text-clay">Colour</dt>
                              <dd className="text-ink">{req.preferredColor}</dd>
                            </div>
                          )}
                          {req.preferredSize && (
                            <div>
                              <dt className="text-clay">Size</dt>
                              <dd className="text-ink">{req.preferredSize}</dd>
                            </div>
                          )}
                          {req.budget && (
                            <div>
                              <dt className="text-clay">Your budget</dt>
                              <dd className="text-ink">₹{req.budget}</dd>
                            </div>
                          )}
                        </dl>
                      )}

                      {req.referenceImages?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {req.referenceImages.map((img, i) => (
                            <img
                              key={i}
                              src={img.url}
                              alt={`Reference ${i + 1}`}
                              className="h-16 w-16 rounded-lg object-cover ring-1 ring-clay/15"
                            />
                          ))}
                        </div>
                      )}

                      {req.adminNotes && (
                        <div className="mt-4 rounded-lg bg-oat px-4 py-3 ring-1 ring-clay/15">
                          <p className="text-xs font-medium text-ink">Reply from us</p>
                          <p className="mt-1 text-sm text-clay">{req.adminNotes}</p>
                        </div>
                      )}

                      {/* ── APPROVED: show quoted price + Pay Now ── */}
                      {needsPayment && (
                        <div className="mt-5 rounded-xl bg-white px-4 py-4 ring-1 ring-emerald-200">
                          <p className="text-sm font-medium text-ink">
                            🎉 Your request has been approved!
                          </p>
                          <p className="mt-1 text-sm text-clay">
                            Quoted price:{" "}
                            <span className="font-semibold text-ink">
                              {formatPrice(req.quotedPrice)}
                            </span>
                          </p>
                          {req.adminNotes && (
                            <p className="mt-1 text-xs text-clay">{req.adminNotes}</p>
                          )}
                          {thisPayErr && (
                            <p className="mt-2 text-xs text-red-600">{thisPayErr}</p>
                          )}
                          <button
                            onClick={() => handlePayNow(req)}
                            disabled={isPaying}
                            className="mt-3 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CreditCard size={15} />
                            {isPaying
                              ? "Opening payment…"
                              : `Pay now — ${formatPrice(req.quotedPrice)}`}
                          </button>
                        </div>
                      )}

                      {/* ── CONVERTED: show link to order tracking ── */}
                      {isPaid && (
                        <div className="mt-5 rounded-xl bg-purple-50 px-4 py-4 ring-1 ring-purple-200">
                          <p className="text-sm font-medium text-purple-800">
                            ✓ Payment received — your order is being made!
                          </p>
                          <button
                            onClick={() =>
                              navigate(`/orders/${req.convertedOrder._id || req.convertedOrder}`)
                            }
                            className="mt-2 flex items-center gap-1.5 text-sm text-purple-700 hover:underline"
                          >
                            <ExternalLink size={13} />
                            Track your order
                          </button>
                        </div>
                      )}

                      {req.status === "rejected" && (
                        <p className="mt-4 text-sm text-red-600">
                          We're sorry, we weren't able to take on this request.
                          {!req.adminNotes &&
                            " Feel free to submit a new one with different details."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
