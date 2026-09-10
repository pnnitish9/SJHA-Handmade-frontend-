import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { getProductRequest } from "../api/products.js";
import { getProductReviewsRequest } from "../api/reviews.js";
import { formatPrice } from "../utils/formatPrice.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  const [product, setProduct] = useState(null);
  const [productId, setProductId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState({ type: "", message: "" });

  // Fetch product by slug
  useEffect(() => {
    setStatus({ type: "", message: "" });
    setProduct(null);
    setProductId(null);
    setReviews([]);
    getProductRequest(slug).then(({ data }) => {
      setProduct(data.product);
      setProductId(data.product._id);
      setActiveImage(0);
      setSelectedVariant(data.product.variants?.[0]?._id || null);
      setQuantity(1);
    });
  }, [slug]);

  // Fetch reviews independently so they can be refreshed without re-fetching the product
  const fetchReviews = (id) => {
    if (!id) return;
    setReviewsLoading(true);
    getProductReviewsRequest(id)
      .then(({ data }) => setReviews(data.reviews))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  };

  useEffect(() => {
    fetchReviews(productId);
  }, [productId]);

  if (!product) {
    return <p className="py-24 text-center text-clay">Loading…</p>;
  }

  const variant = product.variants?.find((v) => v._id === selectedVariant);
  const stock = variant ? variant.stock : product.stock;
  const price = variant?.price ?? product.discountPrice ?? product.price;
  const wishlisted = isAuthenticated && isWishlisted(product._id);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/shop/${slug}` } } });
      return;
    }
    try {
      await addItem(product._id, selectedVariant, quantity);
      setStatus({ type: "success", message: "Added to cart." });
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.message || "Could not add to cart." });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-cream ring-1 ring-clay/15">
            {product.images?.[activeImage] ? (
              <img
                src={product.images[activeImage].url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-clay/50">No image</div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.publicId || i}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg ring-2 ${
                    i === activeImage ? "ring-thread" : "ring-transparent"
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm uppercase tracking-wide text-clay">{product.category?.name}</p>
          <h1 className="mt-1 font-display text-3xl text-ink">{product.name}</h1>

          {product.ratingsCount > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={14}
                    className={n <= Math.round(product.ratingsAverage) ? "fill-thread text-thread" : "text-clay/30"}
                  />
                ))}
              </div>
              <span className="text-xs text-clay">
                {product.ratingsAverage} ({product.ratingsCount} review{product.ratingsCount === 1 ? "" : "s"})
              </span>
            </div>
          )}

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-xl font-medium text-ink">{formatPrice(price)}</span>
            {product.discountPrice && !variant && (
              <span className="text-sm text-clay line-through">{formatPrice(product.price)}</span>
            )}
          </div>

          <p className="mt-5 text-clay">{product.shortDescription || product.description}</p>

          {product.variants?.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm text-ink/80">Options</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v._id}
                    onClick={() => setSelectedVariant(v._id)}
                    disabled={v.stock === 0}
                    className={`rounded-full border px-4 py-1.5 text-sm disabled:opacity-40 ${
                      selectedVariant === v._id
                        ? "border-thread bg-thread text-cream"
                        : "border-clay/30 text-ink hover:border-thread"
                    }`}
                  >
                    {[v.color, v.size].filter(Boolean).join(" / ") || "Option"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-clay">
            {stock > 0 ? `${stock} in stock` : "Out of stock"}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="rounded-lg border border-clay/30 bg-cream px-3 py-2.5 text-sm"
              disabled={stock === 0}
            >
              {Array.from({ length: Math.min(stock, 10) || 1 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button
              onClick={handleAddToCart}
              disabled={stock === 0}
              className="flex-1 rounded-full bg-thread py-3 text-cream transition hover:bg-thread/90 disabled:opacity-50"
            >
              {stock === 0 ? "Out of stock" : "Add to cart"}
            </button>

            {isAuthenticated && (
              <button
                onClick={() => toggle(product._id)}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                className="rounded-full border border-clay/30 p-3 hover:border-thread"
              >
                <Heart size={18} className={wishlisted ? "fill-thread text-thread" : "text-ink"} />
              </button>
            )}
          </div>

          {status.message && (
            <p className={`mt-3 text-sm ${status.type === "error" ? "text-red-600" : "text-moss"}`}>
              {status.message}
            </p>
          )}

          <div className="mt-10 border-t border-clay/20 pt-6">
            <h2 className="font-display text-lg text-ink">Description</h2>
            <p className="mt-2 whitespace-pre-line text-clay">{product.description}</p>
          </div>

          <div className="mt-10 border-t border-clay/20 pt-6">
            <h2 className="font-display text-lg text-ink">Reviews</h2>
            {reviewsLoading ? (
              <p className="mt-2 text-sm text-clay">Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <p className="mt-2 text-sm text-clay">No reviews yet. Be the first to share your thoughts.</p>
            ) : (
              <div className="mt-4 space-y-5">
                {reviews.map((review) => (
                  <div key={review._id} className="border-b border-clay/10 pb-4 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={13}
                            className={n <= review.rating ? "fill-thread text-thread" : "text-clay/30"}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-ink">{review.user?.name}</span>
                    </div>
                    {review.title && <p className="mt-1 text-sm font-medium text-ink">{review.title}</p>}
                    <p className="mt-1 text-sm text-clay">{review.comment}</p>
                    {review.images?.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {review.images.map((img, i) => (
                          <img key={i} src={img.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
