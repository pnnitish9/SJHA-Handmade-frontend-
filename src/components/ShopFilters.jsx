export default function ShopFilters({ categories, filters, onChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg text-ink">Category</h3>
        <ul className="mt-3 space-y-2">
          <li>
            <button
              onClick={() => onChange({ category: "" })}
              className={`text-sm ${!filters.category ? "text-thread" : "text-clay hover:text-ink"}`}
            >
              All
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat._id}>
              <button
                onClick={() => onChange({ category: cat._id })}
                className={`text-sm ${
                  filters.category === cat._id ? "text-thread" : "text-clay hover:text-ink"
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display text-lg text-ink">Price</h3>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={filters.priceMin}
            onChange={(e) => onChange({ priceMin: e.target.value })}
            className="w-full rounded-lg border border-clay/30 bg-cream px-3 py-1.5 text-sm"
          />
          <span className="text-clay">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={filters.priceMax}
            onChange={(e) => onChange({ priceMax: e.target.value })}
            className="w-full rounded-lg border border-clay/30 bg-cream px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg text-ink">Sort by</h3>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          className="mt-3 w-full rounded-lg border border-clay/30 bg-cream px-3 py-1.5 text-sm"
        >
          <option value="-createdAt">Newest</option>
          <option value="price">Price: low to high</option>
          <option value="-price">Price: high to low</option>
          <option value="-ratingsAverage">Top rated</option>
        </select>
      </div>
    </div>
  );
}
