import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { getProductsRequest } from "../api/products.js";
import { getCategoriesRequest } from "../api/categories.js";
import ProductCard from "../components/ProductCard.jsx";
import ShopFilters from "../components/ShopFilters.jsx";

const DEFAULT_FILTERS = { category: "", priceMin: "", priceMax: "", sort: "-createdAt", search: "" };

export default function Shop() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategoriesRequest().then(({ data }) => setCategories(data.categories));
  }, []);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12, sort: filters.sort };
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.priceMin) params["price[gte]"] = filters.priceMin;
      if (filters.priceMax) params["price[lte]"] = filters.priceMax;

      const { data } = await getProductsRequest(params);
      setProducts(data.products);
      setPageInfo({ page: data.page, pages: data.pages, total: data.total });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleFilterChange = (partial) => setFilters((f) => ({ ...f, ...partial }));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleFilterChange({ search: searchInput });
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-ink">Shop</h1>
        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-xs items-center gap-2">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-clay" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-full border border-clay/30 bg-cream py-2 pl-9 pr-4 text-sm"
            />
          </div>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-[200px_1fr]">
        <aside>
          <ShopFilters categories={categories} filters={filters} onChange={handleFilterChange} />
        </aside>

        <div>
          {loading ? (
            <p className="py-16 text-center text-clay">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="py-16 text-center text-clay">No products match your filters.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-clay">{pageInfo.total} product(s)</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {pageInfo.pages > 1 && (
                <div className="mt-10 flex justify-center gap-2">
                  {Array.from({ length: pageInfo.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchProducts(p)}
                      className={`h-9 w-9 rounded-full text-sm ${
                        p === pageInfo.page ? "bg-thread text-cream" : "text-ink hover:bg-cream"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
