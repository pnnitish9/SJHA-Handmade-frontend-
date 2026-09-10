import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useCart } from "../../context/CartContext.jsx";
import { formatPrice } from "../../utils/formatPrice.js";

export default function Cart() {
  const navigate = useNavigate();
  const { cart, loading, updateItem, removeItem } = useCart();

  const subtotal =
    cart.items?.reduce((sum, item) => {
      // Skip items whose product was deleted — they won't reach the subtotal
      // and the backend will prune them on the next getCart call.
      if (!item.product) return sum;
      const price = item.product.discountPrice ?? item.product.price ?? item.priceAtAdd;
      return sum + price * item.quantity;
    }, 0) || 0;

  if (loading) return <p className="py-24 text-center text-clay">Loading your cart…</p>;

  if (!cart.items?.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-ink">Your cart is empty</h1>
        <p className="mt-3 text-clay">Find something handmade to add.</p>
        <Link
          to="/shop"
          className="mt-6 inline-block rounded-full bg-thread px-6 py-3 text-cream hover:bg-thread/90"
        >
          Go to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="font-display text-3xl text-ink">Your cart</h1>

      <div className="mt-8 divide-y divide-clay/20">
        {cart.items.map((item) => {
          const product = item.product;

          // Product was deleted by admin — show a dismissible warning row
          // so the customer can remove it. The backend prunes it on next
          // load, but the in-memory cart state may still have it briefly.
          if (!product) {
            return (
              <div key={item._id} className="flex items-center gap-4 py-6">
                <div className="h-24 w-24 shrink-0 rounded-lg bg-clay/10 ring-1 ring-clay/15 flex items-center justify-center">
                  <span className="text-xs text-clay/50">Removed</span>
                </div>
                <div className="flex flex-1 items-start justify-between gap-3">
                  <div>
                    <p className="text-ink">This item is no longer available</p>
                    <p className="mt-1 text-sm text-red-500">This product has been removed from the store.</p>
                  </div>
                  <button
                    onClick={() => removeItem(item._id)}
                    aria-label="Remove item"
                    className="text-clay hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          }

          const image = product.images?.[0]?.url;
          const price = product.discountPrice ?? product.price;
          const variant = product.variants?.find((v) => v._id === item.variantId);
          const stock = variant ? variant.stock : product.stock;

          return (
            <div key={item._id} className="flex gap-4 py-6">
              <Link to={`/shop/${product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-cream ring-1 ring-clay/15">
                {image && <img src={image} alt={product.name} className="h-full w-full object-cover" />}
              </Link>

              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/shop/${product.slug}`} className="text-ink hover:text-thread">
                      {product.name}
                    </Link>
                    {variant && (
                      <p className="text-sm text-clay">
                        {[variant.color, variant.size].filter(Boolean).join(" / ")}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-clay">{formatPrice(price)} each</p>
                  </div>
                  <button
                    onClick={() => removeItem(item._id)}
                    aria-label="Remove item"
                    className="text-clay hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <select
                    value={item.quantity}
                    onChange={(e) => updateItem(item._id, Number(e.target.value))}
                    className="rounded-lg border border-clay/30 bg-cream px-3 py-1.5 text-sm"
                  >
                    {Array.from({ length: Math.min(Math.max(stock, item.quantity), 10) }, (_, i) => i + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      )
                    )}
                  </select>
                  <span className="text-sm text-ink">{formatPrice(price * item.quantity)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-clay/20 pt-6">
        <span className="font-display text-xl text-ink">Subtotal</span>
        <span className="font-display text-xl text-ink">{formatPrice(subtotal)}</span>
      </div>

      <p className="mt-2 text-sm text-clay">Shipping and coupons are calculated at checkout.</p>

      <button
        onClick={() => navigate("/checkout")}
        className="mt-6 w-full rounded-full bg-thread py-3 text-cream transition hover:bg-thread/90"
      >
        Proceed to checkout
      </button>
    </div>
  );
}
