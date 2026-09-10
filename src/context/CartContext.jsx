import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  getCartRequest,
  addCartItemRequest,
  updateCartItemRequest,
  removeCartItemRequest,
  clearCartRequest,
} from "../api/cart.js";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [] });
      return;
    }
    setLoading(true);
    try {
      const { data } = await getCartRequest();
      setCart(data.cart);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(async (productId, variantId, quantity = 1) => {
    const { data } = await addCartItemRequest({ productId, variantId, quantity });
    setCart(data.cart);
  }, []);

  const updateItem = useCallback(async (itemId, quantity) => {
    const { data } = await updateCartItemRequest(itemId, quantity);
    setCart(data.cart);
  }, []);

  const removeItem = useCallback(async (itemId) => {
    const { data } = await removeCartItemRequest(itemId);
    setCart(data.cart);
  }, []);

  const clear = useCallback(async () => {
    const { data } = await clearCartRequest();
    setCart(data.cart);
  }, []);

  const itemCount = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const value = { cart, loading, itemCount, addItem, updateItem, removeItem, clear, refreshCart };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
