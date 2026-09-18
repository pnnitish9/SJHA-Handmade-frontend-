import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Copy, Check, ShoppingBag } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { formatPrice } from "../utils/formatPrice.js";
import { addAddressRequest } from "../api/auth.js";
import { validateCouponRequest } from "../api/coupons.js";
import { createOrderRequest, submitPaymentProofRequest } from "../api/orders.js";
import AddressForm from "../components/AddressForm.jsx";

const FLAT_SHIPPING_FEE = 50;
const FREE_SHIPPING_THRESHOLD = 999;

const UPI_ID   = "8092297525@ibl";
const UPI_NAME = "SJHA Handmade";

const STEP_ADDRESS = "address";
const STEP_PAY     = "pay";
const STEP_DONE    = "done";

const UPI_MODES = ["PhonePe", "Google Pay", "Paytm", "BHIM", "Other"];

const EMPTY_PROOF = {
  payerName:     "",
  payerPhone:    "",
  transactionId: "",
  paymentDate:   "",
  paymentTime:   "",
  upiMode:       "",
  bankName:      "",
};

export default function Checkout() {
  const { user, setUser } = useAuth();
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();

  // ── Address ───────────────────────────────────────────────────────────────
  const [selectedAddressId, setSelectedAddressId] = useState(
    user?.addresses?.find((a) => a.isDefault)?._id || user?.addresses?.[0]?._id || ""
  );
  const [showAddressForm, setShowAddressForm] = useState(!user?.addresses?.length);
  const [addingAddress, setAddingAddress] = useState(false);

  // ── Coupon ────────────────────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon]           = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);

  // ── Step / order ──────────────────────────────────────────────────────────
  const [step, setStep]             = useState(STEP_ADDRESS);
  const [placing, setPlacing]       = useState(false);
  const [error, setError]           = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);

  // ── Copy UPI ID ───────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // ── Payment proof form ────────────────────────────────────────────────────
  const [proof, setProof]               = useState(EMPTY_PROOF);
  const [screenshot, setScreenshot]     = useState(null);     // File object
  const [screenshotPreview, setScreenshotPreview] = useState(""); // object URL
  const [proofError, setProofError]     = useState("");
  const [submitting, setSubmitting]     = useState(false);

  // ── Derived totals (for STEP_ADDRESS sidebar display) ─────────────────────
  const subtotal =
    cart.items?.reduce((sum, item) => {
      const price = item.product?.discountPrice ?? item.product?.price ?? item.priceAtAdd;
      return sum + price * item.quantity;
    }, 0) || 0;
  const discount    = coupon?.discount || 0;
  const shippingFee = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
  const total       = subtotal - discount + shippingFee;

  // ── Empty cart guard ──────────────────────────────────────────────────────
  if (!cart.items?.length && step !== STEP_DONE) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-ink">Nothing to check out</h1>
        <p className="mt-3 text-clay">Your cart is empty.</p>
        <Link to="/shop" className="mt-6 inline-block rounded-full bg-thread px-6 py-3 text-cream hover:bg-thread/90">
          Go to shop
        </Link>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddAddress = async (address) => {
    setAddingAddress(true);
    try {
      const { data } = await addAddressRequest(address);
      setUser({ ...user, addresses: data.addresses });
      setSelectedAddressId(data.addresses[data.addresses.length - 1]._id);
      setShowAddressForm(false);
    } finally {
      setAddingAddress(false);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError("");
    setCouponChecking(true);
    try {
      const { data } = await validateCouponRequest(couponInput, subtotal);
      setCoupon({ code: data.coupon.code, discount: data.discount });
    } catch (err) {
      setCoupon(null);
      setCouponError(err.response?.data?.message || "Invalid coupon.");
    } finally {
      setCouponChecking(false);
    }
  };

  // "Place Order" — creates the order (reserves stock) and moves to payment page
  const handlePlaceOrder = async () => {
    setError("");
    if (!selectedAddressId) {
      setError("Please select or add a shipping address.");
      return;
    }
    setPlacing(true);
    try {
      const { data } = await createOrderRequest({
        addressId: selectedAddressId,
        couponCode: coupon?.code,
      });
      setCreatedOrder(data.order);
      setStep(STEP_PAY);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleProofChange = (e) => {
    const { name, value } = e.target;
    setProof((p) => ({ ...p, [name]: value }));
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setProofError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofError("Screenshot must be under 5 MB.");
      return;
    }
    setProofError("");
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  // Submit payment details → backend creates payment record, order → payment_verification
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setProofError("");

    // Client-side required check
    const required = ["payerName", "payerPhone", "transactionId", "paymentDate", "paymentTime", "upiMode", "bankName"];
    const missing  = required.filter((k) => !proof[k]?.trim());
    if (missing.length) {
      setProofError("Please fill in all required fields.");
      return;
    }
    if (!screenshot) {
      setProofError("Please upload a screenshot of your payment.");
      return;
    }

    const formData = new FormData();
    Object.entries(proof).forEach(([k, v]) => formData.append(k, v));
    formData.append("screenshot", screenshot);

    setSubmitting(true);
    try {
      await submitPaymentProofRequest(createdOrder._id, formData);
      setStep(STEP_DONE);
    } catch (err) {
      setProofError(err.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: DONE
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEP_DONE) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-moss/15">
          <ShoppingBag size={30} className="text-moss" />
        </div>
        <h1 className="mt-5 font-display text-3xl text-ink">Order Placed!</h1>
        <p className="mt-3 text-clay">
          Your payment details have been submitted. We'll verify and confirm your order shortly.
        </p>

        <div className="mt-6 rounded-xl bg-cream p-5 ring-1 ring-clay/15 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-clay">Order ID</span>
            <span className="font-medium text-ink">{createdOrder?.orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-clay">Amount</span>
            <span className="font-medium text-ink">{formatPrice(createdOrder?.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-clay">Payment Status</span>
            <span className="font-medium text-amber-700">Pending Verification</span>
          </div>
        </div>

        <p className="mt-4 text-xs text-clay">
          Our team will verify your UPI payment and confirm the order. You'll be notified once done.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate(`/orders/${createdOrder._id}`, { replace: true })}
            className="rounded-full bg-thread px-6 py-3 text-sm text-cream hover:bg-thread/90"
          >
            Track order
          </button>
          <Link
            to="/shop"
            className="rounded-full border border-clay/30 px-6 py-3 text-sm text-ink hover:border-thread"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: PAY  (QR left · Form right)
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEP_PAY) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-12">
        {/* Header */}
        <div className="mb-2">
          <h1 className="font-display text-3xl text-ink">Complete Payment</h1>
          <p className="mt-1 text-sm text-clay">
            Scan the QR code or pay to the UPI ID, then fill in your payment details.
          </p>
        </div>

        {/* Amount banner */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-thread/10 px-5 py-2">
          <span className="text-sm text-clay">Amount to pay:</span>
          <span className="font-display text-xl text-thread">{formatPrice(createdOrder?.total)}</span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">

          {/* ── LEFT: QR + UPI ID ─────────────────────────────────────────── */}
          <div className="flex flex-col items-center rounded-2xl bg-cream p-6 ring-1 ring-clay/15 lg:items-start">

            <p className="mb-4 font-display text-lg text-ink">Scan &amp; Pay</p>

            {/* QR image — user drops their QR image at public/upi-qr.png */}
            <div className="flex w-full justify-center">
              <div className="overflow-hidden rounded-2xl border border-clay/20 bg-white p-3 shadow-sm">
                <img
                  src="https://res.cloudinary.com/nm8lyjbu/image/upload/v1789751254/QRCode.jpg"
                  alt="UPI QR Code"
                  className="h-52 w-52 object-contain sm:h-60 sm:w-60"
                  onError={(e) => {
                    // Fallback placeholder if image hasn't been added yet
                    e.currentTarget.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f5f0e8'/%3E%3Ctext x='100' y='95' text-anchor='middle' font-family='sans-serif' font-size='13' fill='%238A6F5C'%3EPlace your QR image at%3C/text%3E%3Ctext x='100' y='115' text-anchor='middle' font-family='sans-serif' font-size='13' fill='%238A6F5C'%3Epublic/upi-qr.png%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
            </div>

            {/* UPI ID row */}
            <div className="mt-5 w-full rounded-xl bg-oat px-4 py-3">
              <p className="text-xs text-clay">UPI ID</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="break-all font-mono text-sm font-semibold text-ink">{UPI_ID}</span>
                <button
                  onClick={handleCopyUpiId}
                  className="shrink-0 rounded-lg border border-clay/30 px-3 py-1.5 text-xs text-ink transition hover:border-thread"
                  aria-label="Copy UPI ID"
                >
                  {copied ? (
                    <span className="flex items-center gap-1 text-moss">
                      <Check size={12} /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy size={12} /> Copy
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <ol className="mt-5 space-y-2 text-sm text-clay">
              <li>
                <span className="font-medium text-ink">1.</span>{" "}
                Open Google Pay, PhonePe, Paytm, or any UPI app.
              </li>
              <li>
                <span className="font-medium text-ink">2.</span>{" "}
                Scan the QR code <em>or</em> send to the UPI ID above.
              </li>
              <li>
                <span className="font-medium text-ink">3.</span>{" "}
                Pay exactly{" "}
                <strong className="text-ink">{formatPrice(createdOrder?.total)}</strong>.
              </li>
              <li>
                <span className="font-medium text-ink">4.</span>{" "}
                Note your UTR / transaction ID from the app.
              </li>
              <li>
                <span className="font-medium text-ink">5.</span>{" "}
                Fill in the form on the right and submit.
              </li>
            </ol>
          </div>

          {/* ── RIGHT: Payment details form ────────────────────────────────── */}
          <form
            onSubmit={handleSubmitProof}
            className="rounded-2xl bg-cream p-6 ring-1 ring-clay/15"
          >
            <p className="mb-5 font-display text-lg text-ink">Payment Details</p>

            <div className="space-y-4">

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="payerName"
                  value={proof.payerName}
                  onChange={handleProofChange}
                  placeholder="Name as on your UPI account"
                  required
                  className="mt-1.5 w-full rounded-xl border border-clay/30 bg-oat px-4 py-2.5 text-sm focus:border-thread focus:outline-none"
                />
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  UPI Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  name="payerPhone"
                  type="tel"
                  value={proof.payerPhone}
                  onChange={handleProofChange}
                  placeholder="Phone number linked to your UPI"
                  required
                  className="mt-1.5 w-full rounded-xl border border-clay/30 bg-oat px-4 py-2.5 text-sm focus:border-thread focus:outline-none"
                />
                <p className="mt-1 text-xs text-clay">
                  Required for refunds if the order is cancelled.
                </p>
              </div>

              {/* UTR */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  UTR / Transaction ID <span className="text-red-500">*</span>
                </label>
                <input
                  name="transactionId"
                  value={proof.transactionId}
                  onChange={handleProofChange}
                  placeholder="e.g. 407123456789"
                  required
                  className="mt-1.5 w-full rounded-xl border border-clay/30 bg-oat px-4 py-2.5 font-mono text-sm focus:border-thread focus:outline-none"
                />
                <p className="mt-1 text-xs text-clay">
                  Find this in your UPI app under transaction history.
                </p>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={proof.paymentDate}
                    onChange={handleProofChange}
                    required
                    className="mt-1.5 w-full rounded-xl border border-clay/30 bg-oat px-4 py-2.5 text-sm focus:border-thread focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="paymentTime"
                    value={proof.paymentTime}
                    onChange={handleProofChange}
                    required
                    className="mt-1.5 w-full rounded-xl border border-clay/30 bg-oat px-4 py-2.5 text-sm focus:border-thread focus:outline-none"
                  />
                </div>
              </div>

              {/* UPI Mode dropdown */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  name="upiMode"
                  value={proof.upiMode}
                  onChange={handleProofChange}
                  required
                  className="mt-1.5 w-full rounded-xl border border-clay/30 bg-oat px-4 py-2.5 text-sm focus:border-thread focus:outline-none"
                >
                  <option value="">Select app</option>
                  {UPI_MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Bank name */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="bankName"
                  value={proof.bankName}
                  onChange={handleProofChange}
                  placeholder="e.g. SBI, HDFC, Kotak"
                  required
                  className="mt-1.5 w-full rounded-xl border border-clay/30 bg-oat px-4 py-2.5 text-sm focus:border-thread focus:outline-none"
                />
              </div>

              {/* Payment screenshot */}
              <div>
                <label className="block text-sm font-medium text-ink">
                  Payment Screenshot <span className="text-red-500">*</span>
                </label>
                <p className="mt-0.5 text-xs text-clay">
                  Upload a screenshot from your UPI app showing the successful payment.
                </p>
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-clay/30 bg-oat px-4 py-5 text-center transition hover:border-thread">
                  {screenshotPreview ? (
                    <img
                      src={screenshotPreview}
                      alt="Payment screenshot preview"
                      className="max-h-40 w-full rounded-lg object-contain"
                    />
                  ) : (
                    <>
                      <svg className="h-8 w-8 text-clay/50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16.5 12L12 7.5m0 0L7.5 12M12 7.5V19" />
                      </svg>
                      <span className="text-xs text-clay">Click to upload (JPG, PNG, WebP · max 5 MB)</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleScreenshotChange}
                    className="sr-only"
                  />
                </label>
                {screenshotPreview && (
                  <button
                    type="button"
                    onClick={() => { setScreenshot(null); setScreenshotPreview(""); }}
                    className="mt-1 text-xs text-clay hover:text-red-500"
                  >
                    Remove screenshot
                  </button>
                )}
              </div>
            </div>

            {proofError && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-700">
                {proofError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-full bg-thread py-3 text-sm font-medium text-cream transition hover:bg-thread/90 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Confirm Payment"}
            </button>

            <p className="mt-3 text-center text-xs text-clay">
              Your order will be confirmed after our team verifies the payment.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: ADDRESS  (default)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-12">
      <h1 className="font-display text-3xl text-ink">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">

        {/* ── Left column ── */}
        <div className="space-y-8">

          {/* Shipping address */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">Shipping address</h2>
              {!showAddressForm && (
                <button onClick={() => setShowAddressForm(true)} className="text-sm text-thread">
                  + Add new
                </button>
              )}
            </div>

            {showAddressForm ? (
              <div className="mt-4">
                <AddressForm
                  onSubmit={handleAddAddress}
                  onCancel={user?.addresses?.length ? () => setShowAddressForm(false) : undefined}
                  submitting={addingAddress}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {user?.addresses?.map((addr) => (
                  <label
                    key={addr._id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 transition ${
                      selectedAddressId === addr._id ? "bg-cream ring-thread" : "ring-clay/15"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr._id}
                      onChange={() => setSelectedAddressId(addr._id)}
                      className="mt-1"
                    />
                    <div className="text-sm text-ink">
                      <p className="font-medium">{addr.fullName}</p>
                      <p className="text-clay">{addr.phone}</p>
                      <p className="text-clay">
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state}{" "}
                        {addr.postalCode}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Payment method indicator */}
          <section>
            <h2 className="font-display text-xl text-ink">Payment method</h2>
            <div className="mt-4">
              <label className="flex cursor-default items-center gap-3 rounded-xl bg-cream p-4 ring-1 ring-thread">
                <input type="radio" checked readOnly className="accent-thread" />
                <div>
                  <p className="text-sm font-medium text-ink">UPI Payment</p>
                  <p className="text-xs text-clay">Google Pay · PhonePe · Paytm · BHIM · Any UPI App</p>
                </div>
              </label>
            </div>
          </section>

          {/* Coupon */}
          <section>
            <h2 className="font-display text-xl text-ink">Coupon</h2>
            <div className="mt-4 flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="w-full rounded-xl border border-clay/30 bg-oat px-3 py-2.5 text-sm"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!couponInput || couponChecking}
                className="shrink-0 rounded-xl border border-clay/30 px-4 py-2.5 text-sm text-ink hover:border-thread disabled:opacity-50"
              >
                Apply
              </button>
            </div>
            {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
            {coupon && <p className="mt-1 text-xs text-moss">Coupon "{coupon.code}" applied.</p>}
          </section>
        </div>

        {/* ── Order summary sidebar ── */}
        <div className="space-y-4">
          <aside className="h-fit rounded-xl bg-cream p-5 ring-1 ring-clay/15 lg:sticky lg:top-24">
            <h2 className="font-display text-xl text-ink">Order summary</h2>

            <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item._id} className="flex justify-between text-sm">
                  <span className="text-ink">
                    {item.product?.name} × {item.quantity}
                  </span>
                  <span className="text-clay">
                    {formatPrice(
                      (item.product?.discountPrice ?? item.product?.price ?? item.priceAtAdd) *
                        item.quantity
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-clay/20 pt-4 text-sm">
              <div className="flex justify-between text-ink">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-moss">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? "Free" : formatPrice(shippingFee)}</span>
              </div>
              <div className="flex justify-between border-t border-clay/20 pt-2 font-medium text-ink">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={placing || showAddressForm}
              className="mt-5 w-full rounded-full bg-thread py-3 text-sm font-medium text-cream transition hover:bg-thread/90 disabled:opacity-60"
            >
              {placing ? "Creating order…" : `Place order — ${formatPrice(total)}`}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
