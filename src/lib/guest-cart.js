// Guest Cart Management - handles cart persistence for unauthenticated users

const GUEST_CART_KEY = 'fmm_guest_cart';

export const guestCart = {
  /**
   * Get all items in guest cart
   */
  getItems: () => {
    try {
      const items = localStorage.getItem(GUEST_CART_KEY);
      return items ? JSON.parse(items) : [];
    } catch (e) {
      console.error('Failed to load guest cart:', e);
      return [];
    }
  },

  /**
   * Add item to guest cart
   */
  addItem: (item) => {
    try {
      const items = guestCart.getItems();
      const existingIndex = items.findIndex(i => i.id === item.id);
      
      if (existingIndex >= 0) {
        // Item already in cart, increase quantity
        items[existingIndex].quantity = (items[existingIndex].quantity || 1) + (item.quantity || 1);
      } else {
        // New item
        items.push({
          ...item,
          quantity: item.quantity || 1,
          addedAt: new Date().toISOString(),
        });
      }
      
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
      guestCart.notifyUpdate();
      return items;
    } catch (e) {
      console.error('Failed to add item to guest cart:', e);
      return [];
    }
  },

  /**
   * Remove item from guest cart
   */
  removeItem: (itemId) => {
    try {
      const items = guestCart.getItems();
      const filtered = items.filter(i => i.id !== itemId);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(filtered));
      guestCart.notifyUpdate();
      return filtered;
    } catch (e) {
      console.error('Failed to remove item from guest cart:', e);
      return [];
    }
  },

  /**
   * Update item quantity
   */
  updateQuantity: (itemId, quantity) => {
    try {
      const items = guestCart.getItems();
      const item = items.find(i => i.id === itemId);
      if (item) {
        item.quantity = Math.max(0, quantity);
        if (item.quantity === 0) {
          return guestCart.removeItem(itemId);
        }
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
        guestCart.notifyUpdate();
      }
      return items;
    } catch (e) {
      console.error('Failed to update item quantity:', e);
      return [];
    }
  },

  /**
   * Clear all guest cart items
   */
  clear: () => {
    try {
      localStorage.removeItem(GUEST_CART_KEY);
      guestCart.notifyUpdate();
    } catch (e) {
      console.error('Failed to clear guest cart:', e);
    }
  },

  /**
   * Get total items in cart
   */
  getTotal: () => {
    return guestCart.getItems().reduce((sum, item) => sum + (item.quantity || 1), 0);
  },

  /**
   * Notify listeners of cart update
   */
  notifyUpdate: () => {
    window.dispatchEvent(new Event('fmm-cart-updated'));
  },
};

export default guestCart;
