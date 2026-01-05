import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/api";
import { apiCall } from "../api/api";

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load cart from database on mount (if user is logged in)
  useEffect(() => {
    const loadCart = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        // If not logged in, try to load from localStorage as fallback
        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
          try {
            setCart(JSON.parse(savedCart));
          } catch (e) {
            console.error("Error loading cart from localStorage:", e);
          }
        }
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await apiCall(() => API.get("/users/cart"));
        if (error) {
          console.error("Error loading cart from server:", error);
          // Fallback to localStorage
          const savedCart = localStorage.getItem("cart");
          if (savedCart) {
            try {
              setCart(JSON.parse(savedCart));
            } catch (e) {
              console.error("Error loading cart from localStorage:", e);
            }
          }
        } else {
          setCart(data || []);
          // Also save to localStorage as backup
          localStorage.setItem("cart", JSON.stringify(data || []));
        }
      } catch (e) {
        console.error("Error loading cart:", e);
        // Fallback to localStorage
        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
          try {
            setCart(JSON.parse(savedCart));
          } catch (err) {
            console.error("Error loading cart from localStorage:", err);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, []);

  // Save cart to database and localStorage whenever it changes
  useEffect(() => {
    if (loading) return; // Don't save during initial load

    // Save to localStorage immediately
    localStorage.setItem("cart", JSON.stringify(cart));

    // Save to database if user is logged in
    const token = localStorage.getItem("token");
    if (token && cart.length >= 0) {
      // Debounce API calls to avoid too many requests
      const timeoutId = setTimeout(async () => {
        try {
          await apiCall(() => API.post("/users/cart", { items: cart }));
        } catch (e) {
          console.error("Error saving cart to server:", e);
        }
      }, 500); // Wait 500ms before saving to server

      return () => clearTimeout(timeoutId);
    }
  }, [cart, loading]);

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (cartItem) => cartItem._id === item._id && cartItem.type === item.type
      );

      // For products, use stock field; for crops, use quantity field
      const availableStock = item.type === "crop" 
        ? (item.quantity !== undefined ? item.quantity : null)
        : (item.stock !== undefined ? item.stock : null);
      const quantityToAdd = 1; // Always add 1 at a time

      if (existingItem) {
        // Update quantity if item already exists
        if (availableStock !== null) {
          // Limit to available stock/quantity
          const newQuantity = Math.min(
            existingItem.quantity + quantityToAdd,
            availableStock
          );
          return prevCart.map((cartItem) =>
            cartItem._id === item._id && cartItem.type === item.type
              ? { ...cartItem, quantity: newQuantity }
              : cartItem
          );
        } else {
          // No stock/quantity limit, allow unlimited quantity
          return prevCart.map((cartItem) =>
            cartItem._id === item._id && cartItem.type === item.type
              ? { ...cartItem, quantity: cartItem.quantity + quantityToAdd }
              : cartItem
          );
        }
      } else {
        // Add new item
        const initialQuantity = availableStock !== null
          ? Math.min(quantityToAdd, availableStock)
          : quantityToAdd;
        // For crops, preserve original quantity as availableQuantity
        const cartItem = item.type === "crop" && item.quantity !== undefined
          ? { ...item, availableQuantity: item.quantity, quantity: initialQuantity }
          : { ...item, quantity: initialQuantity };
        return [...prevCart, cartItem];
      }
    });
  };

  const removeFromCart = (itemId, type) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) => !(item._id === itemId && item.type === type)
      )
    );
  };

  const updateQuantity = (itemId, type, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId, type);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item._id === itemId && item.type === type) {
          // For crops, use availableQuantity field (preserved from original); for products, use stock field
          const availableLimit = item.type === "crop"
            ? (item.availableQuantity !== undefined && item.availableQuantity !== null ? item.availableQuantity : null)
            : (item.stock !== undefined && item.stock !== null ? item.stock : null);
          
          if (availableLimit !== null) {
            // Limit quantity to available stock/quantity
            const limitedQuantity = Math.min(quantity, availableLimit);
            return { ...item, quantity: limitedQuantity };
          }
          // No limit, allow any quantity
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartCount,
    getCartTotal,
    loading,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

