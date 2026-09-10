import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useWishlist } from "../../context/WishlistContext.jsx";
import { formatPrice } from "../../utils/formatPrice.js";

export default function Wishlist() {
  const { wishlist, toggle } = useWishlist();

  if (!wishlist.products?.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-ink">Your wishlist is empty</h1>
        <p className="mt-3 text-clay">Tap the heart on any product to save it here.</p>
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
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-3xl text-ink">Your wishlist</h1>

      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4">
        {wishlist.products.map(({ product }) => {
          if (!product) return null;
          const image = product.images?.[0]?.url;
          return (
            <div key={product._id} className="group relative">
              <Link to={`/shop/${product.slug}`} className="block">
                <div className="aspect-square overflow-hidden rounded-xl bg-cream ring-1 ring-clay/15">
                  {image && (
                    <img
                      src={image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="mt-3 text-sm text-ink">{product.name}</p>
                <p className="text-sm font-medium text-ink">
                  {formatPrice(product.discountPrice ?? product.price)}
                </p>
              </Link>
              <button
                onClick={() => toggle(product._id)}
                aria-label="Remove from wishlist"
                className="absolute right-3 top-3 rounded-full bg-cream/90 p-2 shadow-sm hover:bg-cream"
              >
                <Heart size={16} className="fill-thread text-thread" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
