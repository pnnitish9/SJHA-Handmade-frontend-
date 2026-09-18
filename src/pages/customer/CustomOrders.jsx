import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { ChevronDown, ChevronUp, PlusCircle, X, CreditCard, ExternalLink, Copy, Check } from "lucide-react";
import {
  createCustomOrderRequest,
  getMyCustomOrdersRequest,
  initiateCustomOrderPaymentRequest,
} from "../../api/customOrders.js";
import { submitPaymentProofRequest } from "../../api/orders.js";
import { getPaymentConfigRequest } from "../../api/payments.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
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
  productType: "", preferredColor: "", preferredSize: "", budget: "", description: "",
};
const EMPTY_PROOF = {
  transactionId: "", payerName: "", payerPhone: "",
  bankName: "", paymentDate: "", paymentTime: "", paidAmount: "",
};

// Which payment sub-step is active for a given custom order id
// null | "upi" | "proof"
function usePayFlow() {
  const [flow, setFlow] = useState({}); // { [reqId]: "upi" | "proof" | null }
  const set  = (id, step) => setFlow((f) => ({ ...f, [id]: step }));
  const get  = (id)       => flow[id] || null;
  const clear = (id)      => setFlow((f) => ({ ...f, [id]: null }));
  return { set, get, clear };
}

export default function CustomOrders() {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const { refreshCart } = useCart();

  const [requests, setRequests]       = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [expandedId, setExpandedId]   = useState(null);

  const [form, setForm]           = useState(EMPTY_FORM);
  const [files, setFiles]         = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess]     = useState(false);

  // UPI config (loaded once)
  const [upiConfig, setUpiConfig] = useState({ upiId: "", upiName: "SJHA Handmade" });

  // Per-request payment state
  const payFlow = usePayFlow();
  const [activeOrder, setActiveOrder]     = useState({}); // { [reqId]: order }
  const [qrUrls, setQrUrls]               = useState({}); // { [reqId]: dataUrl }
  const [copied, setCopied]               = useState(false);
  const [proofForm, setProofForm]         = useState({}); // { [reqId]: EMPTY_PROOF }
  const [screenshot, setScreenshot]       = useState({}); // { [reqId]: File }
  const [screenshotPrev, setScreenshotPrev] = useState({}); // { [reqId]: string }
  const [payError, setPayError]           = useState({}); // { [reqId]: string }
  const [initiating, setInitiating]       = useState({}); // { [reqId]: bool }
  const [proofSubmitting, setProofSubmitting] = useState({}); // { [reqId]: bool }

  const loadRequests = () => {
    setLoadingList(true);
    getMyCustomOrdersRequest()
      .then(({ data }) => setRequests(data.customOrders))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    loadRequests();
    getPaymentConfigRequest().then(({ data }) => setUpiConfig(data.config)).catch(() => {});
  }, []);

  // Generate QR when UPI step is opened
  const openUpiStep = async (req, order) => {
    setActiveOrder((o) => ({ ...o, [req._id]: order }));
    setProofForm((p) => ({ ...p, [req._id]: { ...EMPTY_PROOF, paidAmount: String(order.total) } }));
    payFlow.set(req._id, "upi");

    if (upiConfig.upiId) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiConfig.upiId)}&pn=${encodeURIComponent(upiConfig.upiName)}&am=${order.total}&cu=INR`;
      const dataUrl = await QRCode.toDataURL(upiUrl, { width: 200, margin: 2 });
      setQrUrls((q) => ({ ...q, [req._id]: dataUrl }));
    }
  };

  const handlePayNow = async (req) => {
    setPayError((e) => ({ ...e, [req._id]: "" }));
    setInitiating((i) => ({ ...i, [req._id]: true }));
    try {
      const { data } = await initiateCustomOrderPaymentRequest(req._id);
      await openUpiStep(req, data.order);
      loadRequests(); // refresh so convertedOrder is populated
    } catch (err) {
      setPayError((e) => ({ ...e, [req._id]: err.response?.data?.message || "Could not initiate payment." }));
    } finally {
      setInitiating((i) => ({ ...i, [req._id]: false }));
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiConfig.upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleScreenshot = (reqId, file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setPayError((e) => ({ ...e, [reqId]: "Please upload a JPG, PNG, or WebP image." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPayError((e) => ({ ...e, [reqId]: "Screenshot must be under 5 MB." }));
      return;
    }
    setPayError((e) => ({ ...e, [reqId]: "" }));
    setScreenshot((s) => ({ ...s, [reqId]: file }));
    setScreenshotPrev((p) => ({ ...p, [reqId]: URL.createObjectURL(file) }));
  };

  const handleProofField = (reqId, name, value) => {
    setProofForm((p) => ({ ...p, [reqId]: { ...(p[reqId] || EMPTY_PROOF), [name]: value } }));
  };

  const handleSubmitProof = async (e, req) => {
    e.preventDefault();
    const order = activeOrder[req._id];
    if (!order) return;
    const file = screenshot[req._id];
    if (!file) {
      setPayError((e2) => ({ ...e2, [req._id]: "Please upload a payment screenshot." }));
      return;
    }
    setPayError((e2) => ({ ...e2, [req._id]: "" }));
    setProofSubmitting((s) => ({ ...s, [req._id]: true }));

    const fd = new FormData();
    fd.append("screenshot", file);
    const pf = proofForm[req._id] || EMPTY_PROOF;
    Object.entries(pf).forEach(([k, v]) => fd.append(k, v));

    try {
      await submitPaymentProofRequest(order._id, fd);
      await refreshCart();
      payFlow.clear(req._id);
      loadRequests();
    } catch (err) {
      setPayError((e2) => ({ ...e2, [req._id]: err.response?.data?.message || "Submission failed." }));
    } finally {
      setProofSubmitting((s) => ({ ...s, [req._id]: false }));
    }
  };

  // ── Form submit ──────────────────────────────────────────────────────────
  const handleFormChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.productType.trim() || !form.description.trim()) {
      setFormError("Please fill in what you'd like made and a description.");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
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

      {success && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <p className="text-sm text-emerald-700">✓ Request submitted! We'll review it soon.</p>
        </div>
      )}

      {/* New request form */}
      {showForm && (
        <form onSubmit={handleSubmitForm} className="mt-6 space-y-4 rounded-xl bg-cream p-5 ring-1 ring-clay/15">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">New custom request</h2>
            <button type="button" onClick={() => { setShowForm(false); setFormError(""); }} className="text-clay hover:text-ink" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <FormField label="What would you like made? *" name="productType" value={form.productType} onChange={handleFormChange} placeholder="e.g. Crochet tote bag" required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Preferred colour" name="preferredColor" value={form.preferredColor} onChange={handleFormChange} placeholder="e.g. Sage green" />
            <FormField label="Preferred size" name="preferredSize" value={form.preferredSize} onChange={handleFormChange} placeholder="e.g. Medium" />
          </div>
          <FormField label="Budget (₹, optional)" type="number" name="budget" value={form.budget} onChange={handleFormChange} min="0" placeholder="e.g. 800" />
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink/80">Description * <span className="text-clay">(materials, style, occasion)</span></span>
            <textarea name="description" value={form.description} onChange={handleFormChange} rows={4} required placeholder="Tell us as much as you can…" className="w-full rounded-lg border border-clay/30 bg-oat px-4 py-2.5 text-sm text-ink placeholder:text-clay/50 focus:border-thread focus:outline-none" />
          </label>
          <div>
            <span className="mb-1.5 block text-sm text-ink/80">Reference images <span className="text-clay">(optional, up to 4)</span></span>
            <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 4))} className="text-sm text-clay" />
            {files.length > 0 && <p className="mt-1 text-xs text-clay">{files.length} file{files.length > 1 ? "s" : ""} selected</p>}
          </div>
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{formError}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="rounded-full bg-thread px-5 py-2 text-sm text-cream hover:bg-thread/90 disabled:opacity-60">
              {submitting ? "Submitting…" : "Submit request"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(""); }} className="text-sm text-clay hover:text-ink">Cancel</button>
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
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-thread hover:underline">Submit your first custom request →</button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {requests.map((req) => {
              const isExpanded    = expandedId === req._id;
              const currentFlow   = payFlow.get(req._id);
              const needsPayment  = req.status === "approved" && !req.convertedOrder;
              const isPendingProof = req.convertedOrder &&
                (req.convertedOrder?.status === "payment_pending" ||
                 req.convertedOrder?.paymentStatus === "pending");
              const isPaid        = req.status === "converted";
              const pf            = proofForm[req._id] || EMPTY_PROOF;
              const order         = activeOrder[req._id];

              return (
                <div key={req._id} className={`overflow-hidden rounded-xl ring-1 ${needsPayment || isPendingProof ? "bg-emerald-50 ring-emerald-200" : "bg-cream ring-clay/15"}`}>
                  {/* Summary row */}
                  <button type="button" onClick={() => toggleExpand(req._id)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5">
                    <div className="flex flex-1 items-center gap-3 min-w-0">
                      <StatusBadge status={req.status} />
                      <p className="truncate text-sm font-medium text-ink">{req.productType}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-clay">
                      <span>{new Date(req.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-clay/15 px-4 pb-5 pt-4 sm:px-5">
                      <p className="text-sm text-clay">{req.description}</p>

                      {(req.preferredColor || req.preferredSize || req.budget) && (
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                          {req.preferredColor && <div><dt className="text-clay">Colour</dt><dd className="text-ink">{req.preferredColor}</dd></div>}
                          {req.preferredSize  && <div><dt className="text-clay">Size</dt><dd className="text-ink">{req.preferredSize}</dd></div>}
                          {req.budget         && <div><dt className="text-clay">Your budget</dt><dd className="text-ink">₹{req.budget}</dd></div>}
                        </dl>
                      )}

                      {req.referenceImages?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {req.referenceImages.map((img, i) => (
                            <img key={i} src={img.url} alt={`Reference ${i + 1}`} className="h-16 w-16 rounded-lg object-cover ring-1 ring-clay/15" />
                          ))}
                        </div>
                      )}

                      {req.adminNotes && (
                        <div className="mt-4 rounded-lg bg-oat px-4 py-3 ring-1 ring-clay/15">
                          <p className="text-xs font-medium text-ink">Reply from us</p>
                          <p className="mt-1 text-sm text-clay">{req.adminNotes}</p>
                        </div>
                      )}

                      {/* ── APPROVED — initiate payment ── */}
                      {(needsPayment || isPendingProof) && !currentFlow && (
                        <div className="mt-5 rounded-xl bg-white px-4 py-4 ring-1 ring-emerald-200">
                          <p className="text-sm font-medium text-ink">🎉 Your request has been approved!</p>
                          <p className="mt-1 text-sm text-clay">Quoted price: <span className="font-semibold text-ink">{formatPrice(req.quotedPrice)}</span></p>
                          {payError[req._id] && <p className="mt-2 text-xs text-red-600">{payError[req._id]}</p>}
                          <button
                            onClick={() => handlePayNow(req)}
                            disabled={initiating[req._id]}
                            className="mt-3 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CreditCard size={15} />
                            {initiating[req._id] ? "Preparing…" : `Pay via UPI — ${formatPrice(req.quotedPrice)}`}
                          </button>
                        </div>
                      )}

                      {/* ── UPI QR step ── */}
                      {currentFlow === "upi" && order && (
                        <div className="mt-5 rounded-xl bg-white px-4 py-5 ring-1 ring-emerald-200">
                          <p className="mb-3 text-center text-sm font-medium text-ink">Scan & Pay</p>
                          <div className="flex flex-col items-center gap-3">
                            <p className="font-display text-3xl text-ink">{formatPrice(order.total)}</p>
                            {qrUrls[req._id] ? (
                              <img src={qrUrls[req._id]} alt="UPI QR" className="h-44 w-44 rounded-xl border border-clay/20 p-1.5" />
                            ) : (
                              <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-clay/20"><p className="text-xs text-clay">Generating…</p></div>
                            )}
                            <div className="w-full rounded-lg bg-oat px-3 py-2.5">
                              <p className="text-xs text-clay">UPI ID</p>
                              <div className="mt-0.5 flex items-center justify-between gap-2">
                                <span className="break-all text-sm font-medium text-ink">{upiConfig.upiId || "—"}</span>
                                <button onClick={handleCopyUpi} className="shrink-0 rounded-lg border border-clay/30 px-2.5 py-1 text-xs text-ink hover:border-thread">
                                  {copied ? <span className="flex items-center gap-1 text-moss"><Check size={11} /> Copied</span> : <span className="flex items-center gap-1"><Copy size={11} /> Copy</span>}
                                </button>
                              </div>
                            </div>
                          </div>
                          <ol className="mt-4 space-y-1 text-xs text-clay">
                            <li><span className="font-medium text-ink">1.</span> Open Google Pay / PhonePe / Paytm / BHIM.</li>
                            <li><span className="font-medium text-ink">2.</span> Scan the QR or pay to the UPI ID above.</li>
                            <li><span className="font-medium text-ink">3.</span> Pay exactly <strong className="text-ink">{formatPrice(order.total)}</strong> and note your UTR.</li>
                          </ol>
                          <button onClick={() => payFlow.set(req._id, "proof")} className="mt-4 w-full rounded-full bg-thread py-2.5 text-sm text-cream hover:bg-thread/90">
                            Payment Completed — Upload Proof
                          </button>
                          <button onClick={() => payFlow.clear(req._id)} className="mt-2 w-full text-xs text-clay hover:text-ink">← Back</button>
                        </div>
                      )}

                      {/* ── Proof form step ── */}
                      {currentFlow === "proof" && order && (
                        <form onSubmit={(e) => handleSubmitProof(e, req)} className="mt-5 space-y-4 rounded-xl bg-white px-4 py-5 ring-1 ring-emerald-200">
                          <p className="text-sm font-medium text-ink">Upload Payment Proof</p>

                          {/* Screenshot */}
                          <div>
                            <label className="block text-sm font-medium text-ink">Screenshot <span className="text-red-500">*</span></label>
                            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(e) => handleScreenshot(req._id, e.target.files?.[0])} className="mt-1 block w-full text-sm text-clay file:mr-3 file:rounded-lg file:border file:border-clay/30 file:bg-oat file:px-2.5 file:py-1 file:text-xs file:text-ink hover:file:border-thread" />
                            {screenshotPrev[req._id] && <img src={screenshotPrev[req._id]} alt="Preview" className="mt-2 max-h-36 rounded-lg border border-clay/20 object-contain" />}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-ink">UTR / Transaction ID <span className="text-red-500">*</span></label>
                            <input name="transactionId" value={pf.transactionId} onChange={(e) => handleProofField(req._id, "transactionId", e.target.value)} required placeholder="e.g. 123456789012" className="mt-1 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm focus:border-thread focus:outline-none" />
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-sm font-medium text-ink">Payer Name <span className="text-red-500">*</span></label>
                              <input name="payerName" value={pf.payerName} onChange={(e) => handleProofField(req._id, "payerName", e.target.value)} required placeholder="Name on UPI account" className="mt-1 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm focus:border-thread focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-ink">Phone <span className="text-red-500">*</span></label>
                              <input name="payerPhone" value={pf.payerPhone} onChange={(e) => handleProofField(req._id, "payerPhone", e.target.value)} required placeholder="UPI linked phone" className="mt-1 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm focus:border-thread focus:outline-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-ink">UPI App <span className="text-red-500">*</span></label>
                            <input name="bankName" value={pf.bankName} onChange={(e) => handleProofField(req._id, "bankName", e.target.value)} required placeholder="e.g. PhonePe, Google Pay" className="mt-1 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm focus:border-thread focus:outline-none" />
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-sm font-medium text-ink">Date <span className="text-red-500">*</span></label>
                              <input type="date" name="paymentDate" value={pf.paymentDate} onChange={(e) => handleProofField(req._id, "paymentDate", e.target.value)} required className="mt-1 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm focus:border-thread focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-ink">Time <span className="text-red-500">*</span></label>
                              <input type="time" name="paymentTime" value={pf.paymentTime} onChange={(e) => handleProofField(req._id, "paymentTime", e.target.value)} required className="mt-1 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm focus:border-thread focus:outline-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-ink">Paid Amount (₹) <span className="text-red-500">*</span></label>
                            <input name="paidAmount" type="number" step="0.01" value={pf.paidAmount} onChange={(e) => handleProofField(req._id, "paidAmount", e.target.value)} required className="mt-1 w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm focus:border-thread focus:outline-none" />
                            <p className="mt-1 text-xs text-clay">Must match: {formatPrice(order.total)}</p>
                          </div>

                          {payError[req._id] && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{payError[req._id]}</p>}

                          <div className="flex gap-3">
                            <button type="button" onClick={() => payFlow.set(req._id, "upi")} className="rounded-full border border-clay/30 px-4 py-2 text-sm text-ink hover:border-thread">← Back</button>
                            <button type="submit" disabled={proofSubmitting[req._id]} className="flex-1 rounded-full bg-thread py-2 text-sm text-cream hover:bg-thread/90 disabled:opacity-60">
                              {proofSubmitting[req._id] ? "Submitting…" : "Submit Proof"}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* ── Submitted / awaiting verification ── */}
                      {req.convertedOrder?.status === "payment_verification" && !currentFlow && (
                        <div className="mt-5 rounded-xl bg-amber-50 px-4 py-4 ring-1 ring-amber-200">
                          <p className="text-sm font-medium text-amber-900">Payment Proof Submitted</p>
                          <p className="mt-1 text-xs text-amber-800">Our team is verifying your payment. Your order will be confirmed shortly.</p>
                          <button onClick={() => navigate(`/orders/${req.convertedOrder._id || req.convertedOrder}`)} className="mt-2 flex items-center gap-1 text-xs text-amber-700 hover:underline">
                            <ExternalLink size={12} /> Track order
                          </button>
                        </div>
                      )}

                      {/* ── CONVERTED / paid ── */}
                      {isPaid && !currentFlow && (
                        <div className="mt-5 rounded-xl bg-purple-50 px-4 py-4 ring-1 ring-purple-200">
                          <p className="text-sm font-medium text-purple-800">✓ Payment verified — your order is being made!</p>
                          <button onClick={() => navigate(`/orders/${req.convertedOrder._id || req.convertedOrder}`)} className="mt-2 flex items-center gap-1.5 text-sm text-purple-700 hover:underline">
                            <ExternalLink size={13} /> Track your order
                          </button>
                        </div>
                      )}

                      {req.status === "rejected" && (
                        <p className="mt-4 text-sm text-red-600">We're sorry, we weren't able to take on this request.{!req.adminNotes && " Feel free to submit a new one."}</p>
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
