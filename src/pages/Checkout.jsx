import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { formatPrice } from "../utils/formatPrice.js";
import { loadRazorpayScript } from "../utils/loadRazorpay.js";
import { addAddressRequest } from "../api/auth.js";
import { validateCouponRequest } from "../api/coupons.js";
import { createOrderRequest } from "../api/orders.js";
import { verifyPaymentRequest } from "../api/payments.js";
import AddressForm from "../components/AddressForm.jsx";

const FLAT_SHIPPING_FEE = 1;
const FREE_SHIPPING_THRESHOLD = 999;

export default function Checkout() {
  const { user, setUser } = useAuth();
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();

  const [selectedAddressId, setSelectedAddressId] = useState(
    user?.addresses?.find((a) => a.isDefault)?._id || user?.addresses?.[0]?._id || ""
  );
  const [showAddressForm, setShowAddressForm] = useState(!user?.addresses?.length);
  const [addingAddress, setAddingAddress] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponError, setCouponError] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const subtotal =
    cart.items?.reduce((sum, item) => {
      const price = item.product?.discountPrice ?? item.product?.price ?? item.priceAtAdd;
      return sum + price * item.quantity;
    }, 0) || 0;

  const discount = coupon?.discount || 0;
  const shippingFee = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
  const total = subtotal - discount + shippingFee;

  if (!cart.items?.length) {
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
        paymentMethod,
        couponCode: coupon?.code,
      });

      await refreshCart();

      if (paymentMethod === "cod") {
        navigate(`/orders/${data.order._id}`, { replace: true });
        return;
      }

      // Razorpay flow
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !data.razorpay) {
        setError("Could not load the payment gateway. Please try again.");
        setPlacing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.razorpay.keyId,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: "SJHA Handmade",
        description: `Order ${data.order.orderNumber}`,
        order_id: data.razorpay.orderId,
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
        theme: { color: "#B85C38" },
        handler: async (response) => {
          try {
            await verifyPaymentRequest({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: data.order._id,
            });
          } finally {
            navigate(`/orders/${data.order._id}`, { replace: true });
          }
        },
        modal: {
          ondismiss: () => {
            // Order already exists with paymentStatus "pending" — visible in order history
            navigate(`/orders/${data.order._id}`, { replace: true });
          },
        },
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong placing your order.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-12">
      <h1 className="font-display text-3xl text-ink">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* Address */}
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
                    className={`flex cursor-pointer items-start gap-3 rounded-lg p-4 ring-1 ${
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
                        {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postalCode}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Payment method */}
          <section>
            <h2 className="font-display text-xl text-ink">Payment method</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label
                className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg p-4 ring-1 ${
                  paymentMethod === "razorpay" ? "bg-cream ring-thread" : "ring-clay/15"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "razorpay"}
                  onChange={() => setPaymentMethod("razorpay")}
                />
                <span className="text-sm text-ink">Pay online (cards, UPI, wallets)</span>
              </label>
              {/* <label
                className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg p-4 ring-1 ${
                  paymentMethod === "cod" ? "bg-cream ring-thread" : "ring-clay/15"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                />
                <span className="text-sm text-ink">Cash on delivery</span>
              </label> */}
            </div>
          </section>
        </div>

        {/* Order summary */}
        <aside className="h-fit rounded-xl bg-cream p-5 ring-1 ring-clay/15 lg:sticky lg:top-24">
          <h2 className="font-display text-xl text-ink">Order summary</h2>

          <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <div key={item._id} className="flex justify-between text-sm">
                <span className="text-ink">
                  {item.product?.name} × {item.quantity}
                </span>
                <span className="text-clay">
                  {formatPrice((item.product?.discountPrice ?? item.product?.price ?? item.priceAtAdd) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2 border-t border-clay/20 pt-4">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={!couponInput || couponChecking}
              className="shrink-0 rounded-lg border border-clay/30 px-3 py-2 text-sm text-ink hover:border-thread disabled:opacity-50"
            >
              Apply
            </button>
          </div>
          {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
          {coupon && <p className="mt-1 text-xs text-moss">Coupon {coupon.code} applied.</p>}

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

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="mt-5 w-full rounded-full bg-thread py-3 text-cream transition hover:bg-thread/90 disabled:opacity-60"
          >
            {placing ? "Placing order…" : `Place order — ${formatPrice(total)}`}
          </button>
        </aside>
      </div>
    </div>
  );
}
