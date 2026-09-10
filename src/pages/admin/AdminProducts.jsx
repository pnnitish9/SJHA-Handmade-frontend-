import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getProductsRequest, deleteProductRequest } from "../../api/products.js";
import { formatPrice } from "../../utils/formatPrice.js";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await getProductsRequest({ limit: 50, sort: "-createdAt" });
    setProducts(data.products);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteProductRequest(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Products</h1>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 rounded-full bg-thread px-5 py-2.5 text-sm text-cream hover:bg-thread/90"
        >
          <Plus size={16} /> Add product
        </Link>
      </div>

      {loading ? (
        <p className="mt-10 text-clay">Loading…</p>
      ) : products.length === 0 ? (
        <p className="mt-10 text-clay">No products yet. Add your first one.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl ring-1 ring-clay/15">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream text-clay">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-clay/10">
              {products.map((product) => (
                <tr key={product._id}>
                  <td className="flex items-center gap-3 px-4 py-3">
                    <div className="h-10 w-10 overflow-hidden rounded-lg bg-cream ring-1 ring-clay/15">
                      {product.images?.[0] && (
                        <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="text-ink">{product.name}</span>
                    {product.isFeatured && (
                      <span className="rounded-full bg-moss/10 px-2 py-0.5 text-xs text-moss">Featured</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">{formatPrice(product.discountPrice ?? product.price)}</td>
                  <td className="px-4 py-3 text-ink">
                    {product.variants?.length
                      ? product.variants.reduce((s, v) => s + v.stock, 0)
                      : product.stock}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        product.isAvailable ? "bg-moss/10 text-moss" : "bg-clay/10 text-clay"
                      }`}
                    >
                      {product.isAvailable ? "Available" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/products/${product._id}/edit`} className="text-clay hover:text-ink">
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(product._id, product.name)}
                        disabled={deletingId === product._id}
                        className="text-clay hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
