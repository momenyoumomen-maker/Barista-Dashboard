import { createContext, useContext, useState, ReactNode } from "react";
import { MenuItem } from "@workspace/api-client-react";

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity: number, notes?: string) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (menuItem: MenuItem, quantity: number, notes = "") => {
    setItems((current) => {
      const existing = current.find((i) => i.menuItem.id === menuItem.id);
      if (existing) {
        return current.map((i) =>
          i.menuItem.id === menuItem.id
            ? { ...i, quantity: i.quantity + quantity, notes: notes || i.notes }
            : i
        );
      }
      return [...current, { menuItem, quantity, notes }];
    });
  };

  const removeItem = (menuItemId: number) => {
    setItems((current) => current.filter((i) => i.menuItem.id !== menuItemId));
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems((current) =>
      current.map((i) => (i.menuItem.id === menuItemId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalPrice = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
