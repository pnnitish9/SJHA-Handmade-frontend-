import { useEffect, useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import {
  getCategoriesRequest,
  createCategoryRequest,
  updateCategoryRequest,
  deleteCategoryRequest,
} from "../../api/categories.js";
import FormField from "../../components/FormField.jsx";

const emptyForm = { name: "", description: "", displayOrder: "0" };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await getCategoriesRequest();
    setCategories(data.categories);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setForm({ name: cat.name, description: cat.description || "", displayOrder: String(cat.displayOrder) });
    setFile(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => fd.append(key, value));
    if (file) fd.append("image", file);

    setSubmitting(true);
    try {
      if (editingId) {
        await updateCategoryRequest(editingId, fd);
      } else {
        await createCategoryRequest(fd);
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Products in this category will be unaffected but uncategorized.`)) return;
    await deleteCategoryRequest(id);
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Categories</h1>

      <form onSubmit={handleSubmit} className="mt-8 max-w-md space-y-4 rounded-xl bg-cream p-5 ring-1 ring-clay/15">
        <p className="text-sm font-medium text-ink">{editingId ? "Edit category" : "Add a category"}</p>
        <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />
        <FormField label="Description" name="description" value={form.description} onChange={handleChange} />
        <FormField
          label="Display order"
          type="number"
          name="displayOrder"
          value={form.displayOrder}
          onChange={handleChange}
        />
        <div>
          <span className="mb-1.5 block text-sm text-ink/80">Image</span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="text-sm text-clay" />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-thread px-5 py-2 text-sm text-cream hover:bg-thread/90 disabled:opacity-60"
          >
            {submitting ? "Saving…" : editingId ? "Save changes" : "Add category"}
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
      ) : (
        <div className="mt-8 divide-y divide-clay/15 rounded-xl ring-1 ring-clay/15">
          {categories.map((cat) => (
            <div key={cat._id} className="flex items-center gap-4 px-4 py-3">
              <div className="h-10 w-10 overflow-hidden rounded-lg bg-cream ring-1 ring-clay/15">
                {cat.image?.url && <img src={cat.image.url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="text-ink">{cat.name}</p>
                {cat.description && <p className="text-xs text-clay">{cat.description}</p>}
              </div>
              <button onClick={() => startEdit(cat)} className="text-clay hover:text-ink">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(cat._id, cat.name)} className="text-clay hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
