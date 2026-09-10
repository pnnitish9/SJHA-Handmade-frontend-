import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import { getWishlistRequest, addToWishlistRequest, removeFromWishlistRequest } from "../api/wishlist.js";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState({ products: [] });

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist({ products: [] });
      return;
    }
    const { data } = await getWishlistRequest();
    setWishlist(data.wishlist);
  }, [isAuthenticated]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const toggle = useCallback(
    async (productId) => {
      const isIn = wishlist.products?.some((p) => p.product?._id === productId);
      const { data } = isIn
        ? await removeFromWishlistRequest(productId)
        : await addToWishlistRequest(productId);
      setWishlist(data.wishlist);
    },
    [wishlist]
  );

  const isWishlisted = useCallback(
    (productId) => wishlist.products?.some((p) => p.product?._id === productId) || false,
    [wishlist]
  );

  const value = { wishlist, toggle, isWishlisted, refreshWishlist };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
};
