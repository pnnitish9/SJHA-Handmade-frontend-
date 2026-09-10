import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { formatPrice } from "../utils/formatPrice.js";
import { useWishlist } from "../context/WishlistContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProductCard({ product }) {
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const wishlisted = isAuthenticated && isWishlisted(product._id);

  const handleWishlist = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    toggle(product._id);
  };

  return (
    <Link to={`/shop/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-cream ring-1 ring-clay/15">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-clay/50">No image</div>
        )}

        {isAuthenticated && (
          <button
            onClick={handleWishlist}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute right-3 top-3 rounded-full bg-cream/90 p-2 shadow-sm transition hover:bg-cream"
          >
            <Heart size={16} className={wishlisted ? "fill-thread text-thread" : "text-ink"} />
          </button>
        )}

        {!product.isAvailable && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs text-cream">
            Out of stock
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-sm text-ink">{product.name}</p>
        <div className="mt-1 flex items-baseline gap-2">
          {product.discountPrice ? (
            <>
              <span className="text-sm font-medium text-thread">{formatPrice(product.discountPrice)}</span>
              <span className="text-xs text-clay line-through">{formatPrice(product.price)}</span>
            </>
          ) : (
            <span className="text-sm font-medium text-ink">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
