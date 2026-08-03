// Guest Cart Management - handles cart persistence for unauthenticated users

const GUEST_CART_KEY = 'fmm_guest_cart';

function buildItemKey(item = {}) {
  const existingKey = String(item?.cart_item_key || item?.id || '').trim();
  if (existingKey) return existingKey;

  const productId = String(item?.product_id || '').trim() || 'guest-item';
  const signature = String(item?.options_signature || 'default').trim() || 'default';
  return `${productId}-${signature}`;
}

function normalizeGuestItem(item = {}) {
  const cartItemKey = buildItemKey(item);
  return {
    ...item,
    id: cartItemKey,
    cart_item_key: cartItemKey,
  };
}

export const guestCart = {
  /**
   * Get all items in guest cart
   */
  getItems: () => {
    try {
      const items = localStorage.getItem(GUEST_CART_KEY);
      if (!items) return [];
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed.map(normalizeGuestItem) : [];
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
      const normalizedItem = normalizeGuestItem(item);
      const itemKey = buildItemKey(normalizedItem);
      const existingIndex = items.findIndex((entry) => buildItemKey(entry) === itemKey);

      if (existingIndex >= 0) {
        items[existingIndex].quantity = (items[existingIndex].quantity || 1) + (normalizedItem.quantity || 1);
      } else {
        items.push({
          ...normalizedItem,
          quantity: normalizedItem.quantity || 1,
          addedAt: normalizedItem.addedAt || new Date().toISOString(),
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
      const targetKey = String(itemId || '').trim();
      const items = guestCart.getItems();
      const filtered = items.filter((item) => {
        const itemKey = buildItemKey(item);
        const productId = String(item?.product_id || '').trim();
        return itemKey !== targetKey && productId !== targetKey;
      });
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
      const targetKey = String(itemId || '').trim();
      const items = guestCart.getItems();
      const item = items.find((entry) => buildItemKey(entry) === targetKey || String(entry?.product_id || '').trim() === targetKey);
      if (item) {
        item.quantity = Math.max(0, quantity);
        if (item.quantity === 0) {
          return guestCart.removeItem(targetKey);
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
    window.dispatchEvent(new CustomEvent('fmm-cart-updated', {
      detail: {
        total: guestCart.getTotal(),
      },
    }));
  },
};

export default guestCart;

