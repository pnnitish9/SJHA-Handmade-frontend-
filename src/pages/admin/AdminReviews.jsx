import { useEffect, useState } from "react";
import { Star, Eye, EyeOff } from "lucide-react";
import { getAllReviewsRequest, setReviewVisibilityRequest } from "../../api/reviews.js";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    getAllReviewsRequest()
      .then(({ data }) => setReviews(data.reviews))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleVisibility = async (id, isHidden) => {
    setSavingId(id);
    try {
      const { data } = await setReviewVisibilityRequest(id, !isHidden);
      setReviews((prev) => prev.map((r) => (r._id === id ? data.review : r)));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Reviews</h1>

      {loading ? (
        <p className="mt-10 text-clay">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-10 text-clay">No reviews yet.</p>
      ) : (
        <div className="mt-8 space-y-3">
          {reviews.map((review) => (
            <div key={review._id} className="rounded-xl bg-cream p-4 ring-1 ring-clay/15 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={13} className={n <= review.rating ? "fill-thread text-thread" : "text-clay/30"} />
                      ))}
                    </div>
                    <span className="text-sm text-ink">{review.user?.name}</span>
                    <span className="text-xs text-clay">on {review.product?.name}</span>
                  </div>
                  {review.title && <p className="mt-1 text-sm font-medium text-ink">{review.title}</p>}
                  <p className="mt-1 text-sm text-clay">{review.comment}</p>
                </div>

                <button
                  onClick={() => handleToggleVisibility(review._id, review.isHidden)}
                  disabled={savingId === review._id}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-clay/30 px-3 py-1.5 text-xs text-ink hover:border-thread disabled:opacity-50"
                >
                  {review.isHidden ? (
                    <>
                      <EyeOff size={12} /> Hidden
                    </>
                  ) : (
                    <>
                      <Eye size={12} /> Visible
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
