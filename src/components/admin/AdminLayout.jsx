import { NavLink, Outlet } from "react-router-dom";

const linkClass = ({ isActive }) =>
  `block rounded-lg px-4 py-2.5 text-sm ${
    isActive ? "bg-thread text-cream" : "text-ink hover:bg-cream"
  }`;

export default function AdminLayout() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-10 md:grid-cols-[200px_1fr]">
      <aside>
        <p className="mb-4 font-display text-xl text-ink">Admin</p>
        <nav className="space-y-1">
          <NavLink to="/admin" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/products" className={linkClass}>
            Products
          </NavLink>
          <NavLink to="/admin/categories" className={linkClass}>
            Categories
          </NavLink>
          <NavLink to="/admin/orders" className={linkClass}>
            Orders
          </NavLink>
          <NavLink to="/admin/coupons" className={linkClass}>
            Coupons
          </NavLink>
          <NavLink to="/admin/custom-orders" className={linkClass}>
            Custom orders
          </NavLink>
          <NavLink to="/admin/customers" className={linkClass}>
            Customers
          </NavLink>
          <NavLink to="/admin/reviews" className={linkClass}>
            Reviews
          </NavLink>
          <NavLink to="/admin/messages" className={linkClass}>
            Messages
          </NavLink>
        </nav>
      </aside>

      <div>
        <Outlet />
      </div>
    </div>
  );
}
