import { useEffect, useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import {
  getCouponsRequest,
  createCouponRequest,
  updateCouponRequest,
  deleteCouponRequest,
} from "../../api/coupons.js";
import FormField from "../../components/FormField.jsx";
import { formatPrice } from "../../utils/formatPrice.js";

const emptyForm = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minOrderValue: "0",
  maxDiscountAmount: "",
  usageLimit: "",
  perUserLimit: "1",
  expiresAt: "",
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await getCouponsRequest();
    setCoupons(data.coupons);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (coupon) => {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
      maxDiscountAmount: coupon.maxDiscountAmount || "",
      usageLimit: coupon.usageLimit ?? "",
      perUserLimit: coupon.perUserLimit,
      expiresAt: coupon.expiresAt?.slice(0, 10) || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      ...form,
      discountValue: Number(form.discountValue),
      minOrderValue: Number(form.minOrderValue) || 0,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      perUserLimit: Number(form.perUserLimit) || 1,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await updateCouponRequest(editingId, payload);
      } else {
        await createCouponRequest(payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Delete coupon "${code}"?`)) return;
    await deleteCouponRequest(id);
    load();
  };

  const isExpired = (coupon) => new Date(coupon.expiresAt) < new Date();

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Coupons</h1>

      <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-4 rounded-xl bg-cream p-5 ring-1 ring-clay/15">
        <p className="text-sm font-medium text-ink">{editingId ? "Edit coupon" : "Create a coupon"}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Code" name="code" value={form.code} onChange={handleChange} required disabled={!!editingId} />
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink/80">Discount type</span>
            <select
              name="discountType"
              value={form.discountType}
              onChange={handleChange}
              className="w-full rounded-lg border border-clay/30 bg-oat px-4 py-2.5 text-ink"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>
        </div>

        <FormField label="Description" name="description" value={form.description} onChange={handleChange} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label={form.discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}
            type="number"
            name="discountValue"
            value={form.discountValue}
            onChange={handleChange}
            required
            min="0"
          />
          <FormField
            label="Max discount (₹, optional)"
            type="number"
            name="maxDiscountAmount"
            value={form.maxDiscountAmount}
            onChange={handleChange}
            min="0"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Min order (₹)" type="number" name="minOrderValue" value={form.minOrderValue} onChange={handleChange} min="0" />
          <FormField label="Total uses (blank = ∞)" type="number" name="usageLimit" value={form.usageLimit} onChange={handleChange} min="0" />
          <FormField label="Uses per customer" type="number" name="perUserLimit" value={form.perUserLimit} onChange={handleChange} min="1" />
        </div>

        <FormField label="Expires on" type="date" name="expiresAt" value={form.expiresAt} onChange={handleChange} required />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-thread px-5 py-2 text-sm text-cream hover:bg-thread/90 disabled:opacity-60"
          >
            {submitting ? "Saving…" : editingId ? "Save changes" : "Create coupon"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-sm text-clay hover:text-ink">
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="mt-10 text-clay">Loading…</p>
      ) : coupons.length === 0 ? (
        <p className="mt-10 text-clay">No coupons yet.</p>
      ) : (
        <div className="mt-8 divide-y divide-clay/15 rounded-xl ring-1 ring-clay/15">
          {coupons.map((coupon) => (
            <div key={coupon._id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1">
                <p className="text-ink">
                  {coupon.code}{" "}
                  {isExpired(coupon) && <span className="text-xs text-red-600">· Expired</span>}
                  {!coupon.isActive && <span className="text-xs text-clay">· Inactive</span>}
                </p>
                <p className="text-xs text-clay">
                  {coupon.discountType === "percentage" ? `${coupon.discountValue}% off` : `${formatPrice(coupon.discountValue)} off`}
                  {coupon.minOrderValue > 0 && ` · Min ${formatPrice(coupon.minOrderValue)}`}
                  {" · "}
                  {coupon.usedCount}/{coupon.usageLimit ?? "∞"} used
                </p>
              </div>
              <button onClick={() => startEdit(coupon)} className="text-clay hover:text-ink">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(coupon._id, coupon.code)} className="text-clay hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
