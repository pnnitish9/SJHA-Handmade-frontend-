import { useState } from "react";
import { Star } from "lucide-react";
import { createReviewRequest } from "../api/reviews.js";

export default function ReviewForm({ orderId, productId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!comment.trim()) {
      setError("Please write a short review.");
      return;
    }

    const fd = new FormData();
    fd.append("orderId", orderId);
    fd.append("productId", productId);
    fd.append("rating", rating);
    fd.append("title", title);
    fd.append("comment", comment);
    files.forEach((file) => fd.append("images", file));

    setSubmitting(true);
    try {
      const { data } = await createReviewRequest(fd);
      onSubmitted(data.review);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg bg-oat p-4 ring-1 ring-clay/15">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star size={20} className={n <= rating ? "fill-thread text-thread" : "text-clay/40"} />
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="w-full rounded-lg border border-clay/30 bg-cream px-3 py-2 text-sm"
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us what you thought…"
        rows={3}
        className="w-full rounded-lg border border-clay/30 bg-cream px-3 py-2 text-sm"
      />
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files))}
        className="text-xs text-clay"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-thread px-5 py-2 text-sm text-cream hover:bg-thread/90 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
