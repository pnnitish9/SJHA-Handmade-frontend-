import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2, Plus, X } from "lucide-react";
import { getCategoriesRequest } from "../../api/categories.js";
import { getProductByIdRequest, createProductRequest, updateProductRequest } from "../../api/products.js";
import FormField from "../../components/FormField.jsx";

const emptyVariant = () => ({ tempId: crypto.randomUUID(), color: "", size: "", sku: "", price: "", stock: "" });

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    shortDescription: "",
    description: "",
    tags: "",
    price: "",
    discountPrice: "",
    stock: "",
    lowStockThreshold: "5",
    isFeatured: false,
    isAvailable: true,
  });
  const [variants, setVariants] = useState([]);
  const [existingImages, setExistingImages] = useState([]); // [{url, publicId}]
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategoriesRequest().then(({ data }) => setCategories(data.categories));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    getProductByIdRequest(id).then(({ data }) => populateForm(data.product));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const populateForm = (product) => {
    setForm({
      name: product.name,
      category: product.category?._id || product.category,
      shortDescription: product.shortDescription || "",
      description: product.description,
      tags: (product.tags || []).join(", "),
      price: product.price,
      discountPrice: product.discountPrice || "",
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      isFeatured: product.isFeatured,
      isAvailable: product.isAvailable,
    });
    setVariants(
      (product.variants || []).map((v) => ({
        tempId: v._id,
        color: v.color || "",
        size: v.size || "",
        sku: v.sku || "",
        price: v.price || "",
        stock: v.stock || "",
      }))
    );
    setExistingImages(product.images || []);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleVariantChange = (tempId, field, value) => {
    setVariants((prev) => prev.map((v) => (v.tempId === tempId ? { ...v, [field]: value } : v)));
  };

  const addVariant = () => setVariants((prev) => [...prev, emptyVariant()]);
  const removeVariant = (tempId) => setVariants((prev) => prev.filter((v) => v.tempId !== tempId));

  const handleFileChange = (e) => setNewFiles(Array.from(e.target.files));

  const removeExistingImage = (publicId) => {
    setExistingImages((prev) => prev.filter((img) => img.publicId !== publicId));
    setRemovedImageIds((prev) => [...prev, publicId]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.category) {
      setError("Please choose a category.");
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => fd.append(key, value));
    fd.append(
      "variants",
      JSON.stringify(
        variants
          .filter((v) => v.color || v.size || v.sku)
          .map((v) => ({ ...v, price: v.price || undefined, stock: Number(v.stock) || 0 }))
      )
    );
    if (removedImageIds.length) fd.append("removeImageIds", removedImageIds.join(","));
    newFiles.forEach((file) => fd.append("images", file));

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateProductRequest(id, fd);
      } else {
        await createProductRequest(fd);
      }
      navigate("/admin/products");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">{isEdit ? "Edit product" : "Add product"}</h1>

      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl space-y-6">
        <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/80">Category</span>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-clay/30 bg-cream px-4 py-2.5 text-ink"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        <FormField
          label="Short description"
          name="shortDescription"
          value={form.shortDescription}
          onChange={handleChange}
        />

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/80">Description</span>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={5}
            className="w-full rounded-lg border border-clay/30 bg-cream px-4 py-2.5 text-ink"
          />
        </label>

        <FormField label="Tags (comma separated)" name="tags" value={form.tags} onChange={handleChange} />

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Price (₹)" type="number" name="price" value={form.price} onChange={handleChange} required min="0" />
          <FormField
            label="Discount price (₹)"
            type="number"
            name="discountPrice"
            value={form.discountPrice}
            onChange={handleChange}
            min="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Base stock (used if no variants)"
            type="number"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            min="0"
          />
          <FormField
            label="Low stock threshold"
            type="number"
            name="lowStockThreshold"
            value={form.lowStockThreshold}
            onChange={handleChange}
            min="0"
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />
            Featured product
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={handleChange} />
            Available for purchase
          </label>
        </div>

        {/* Variants */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink/80">Variants (optional — color, size, stock)</span>
            <button type="button" onClick={addVariant} className="flex items-center gap-1 text-sm text-thread">
              <Plus size={14} /> Add variant
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {variants.map((v) => (
              <div key={v.tempId} className="flex items-center gap-2 overflow-x-auto rounded-lg bg-cream p-3 ring-1 ring-clay/15">
                <input
                  placeholder="Color"
                  value={v.color}
                  onChange={(e) => handleVariantChange(v.tempId, "color", e.target.value)}
                  className="w-20 shrink-0 rounded border border-clay/30 bg-oat px-2 py-1.5 text-sm sm:w-24"
                />
                <input
                  placeholder="Size"
                  value={v.size}
                  onChange={(e) => handleVariantChange(v.tempId, "size", e.target.value)}
                  className="w-16 shrink-0 rounded border border-clay/30 bg-oat px-2 py-1.5 text-sm sm:w-20"
                />
                <input
                  placeholder="SKU"
                  value={v.sku}
                  onChange={(e) => handleVariantChange(v.tempId, "sku", e.target.value)}
                  className="w-20 shrink-0 rounded border border-clay/30 bg-oat px-2 py-1.5 text-sm sm:w-24"
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={v.stock}
                  onChange={(e) => handleVariantChange(v.tempId, "stock", e.target.value)}
                  className="w-16 shrink-0 rounded border border-clay/30 bg-oat px-2 py-1.5 text-sm sm:w-20"
                />
                <button
                  type="button"
                  onClick={() => removeVariant(v.tempId)}
                  className="ml-auto shrink-0 text-clay hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Images */}
        <div>
          <span className="mb-2 block text-sm text-ink/80">Images</span>
          {existingImages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {existingImages.map((img) => (
                <div key={img.publicId} className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-clay/20">
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(img.publicId)}
                    className="absolute right-0 top-0 bg-ink/70 p-0.5 text-cream"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input type="file" multiple accept="image/*" onChange={handleFileChange} className="text-sm text-clay" />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-thread px-6 py-2.5 text-cream hover:bg-thread/90 disabled:opacity-60"
        >
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
      </form>
    </div>
  );
}
