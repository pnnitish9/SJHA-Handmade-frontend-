import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingBag, Heart, User } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

const navLinkClass = ({ isActive }) =>
  `text-sm tracking-wide transition-colors hover:text-thread ${
    isActive ? "text-thread" : "text-ink"
  }`;

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { wishlist } = useWishlist();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-clay/20 bg-oat/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="font-display text-2xl text-ink">
          handmade<span className="text-thread">_s.jha</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/shop" className={navLinkClass}>
            Shop
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <NavLink to="/custom-orders" className={navLinkClass}>
                Custom orders
              </NavLink>
              <Link to="/wishlist" aria-label="Wishlist" className="relative text-ink hover:text-thread">
                <Heart size={20} />
                {wishlist.products?.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-thread text-[10px] text-cream">
                    {wishlist.products.length}
                  </span>
                )}
              </Link>
              <Link to="/cart" aria-label="Cart" className="relative text-ink hover:text-thread">
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-thread text-[10px] text-cream">
                    {itemCount}
                  </span>
                )}
              </Link>
              <Link to="/account" className="flex items-center gap-2 text-sm text-ink hover:text-thread">
                <User size={18} />
                {user?.name?.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full border border-ink/20 px-4 py-1.5 text-sm hover:border-thread hover:text-thread"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-ink hover:text-thread">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-thread px-4 py-2 text-sm text-cream hover:bg-thread/90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-clay/20 px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <NavLink to="/" className={navLinkClass} end onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/shop" className={navLinkClass} onClick={() => setOpen(false)}>
              Shop
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass} onClick={() => setOpen(false)}>
                Admin
              </NavLink>
            )}
            {isAuthenticated ? (
              <>
                <NavLink to="/wishlist" className={navLinkClass} onClick={() => setOpen(false)}>
                  Wishlist{wishlist.products?.length > 0 ? ` (${wishlist.products.length})` : ""}
                </NavLink>
                <NavLink to="/cart" className={navLinkClass} onClick={() => setOpen(false)}>
                  Cart{itemCount > 0 ? ` (${itemCount})` : ""}
                </NavLink>
                <NavLink to="/orders" className={navLinkClass} onClick={() => setOpen(false)}>
                  Orders
                </NavLink>
                <NavLink to="/custom-orders" className={navLinkClass} onClick={() => setOpen(false)}>
                  Custom orders
                </NavLink>
                <NavLink to="/account" className={navLinkClass} onClick={() => setOpen(false)}>
                  Account
                </NavLink>
                <button onClick={handleLogout} className="text-left text-sm text-thread">
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass} onClick={() => setOpen(false)}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={navLinkClass} onClick={() => setOpen(false)}>
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
