import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import guestCart from '@/lib/guest-cart';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function Cart() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: () => base44.entities.CartItem.filter({ user_email: user?.email }),
    enabled: !!user?.email
  });

  // Guest cart state
  const [guestItems, setGuestItems] = React.useState(() => guestCart.getItems());
  useEffect(() => {
    const update = () => setGuestItems(guestCart.getItems());
    window.addEventListener('fmm-cart-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('fmm-cart-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ item, delta }) => {
      if (user) {
        const newQty = item.quantity + delta;
        if (newQty < 1) {
          await base44.entities.CartItem.delete(item.id);
        } else {
          await base44.entities.CartItem.update(item.id, { quantity: newQty });
        }
      } else {
        const newQty = (item.quantity || 1) + delta;
        guestCart.updateQuantity(item.product_id || item.id, newQty);
        setGuestItems(guestCart.getItems());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems', user?.email] });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: async (item) => {
      if (user) {
        await base44.entities.CartItem.delete(item.id);
      } else {
        guestCart.removeItem(item.product_id || item.id);
        setGuestItems(guestCart.getItems());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems', user?.email] });
      toast.success('Item removed');
    }
  });

  const itemsSource = user ? cartItems : guestItems;

  if (itemsSource.length === 0 && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 mb-6">
          <ShoppingBag className="h-12 w-12 text-[#1B3A6B]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Looks like you haven't added anything yet</p>
        <Link to={createPageUrl('Shop')}>
          <Button className="bg-[#1B3A6B] hover:bg-[#162f58]">
            Start Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-3 py-4 sm:px-4 sm:py-6 mx-auto sm:container">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Shopping Cart</h1>

      <div className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-3 sm:space-y-4">
          {itemsSource.map((item) => (
            <Card key={item.id} className="p-3 sm:p-4 shadow-sm">
              <div className="flex gap-3">
                <Link to={createPageUrl(`ProductDetail?id=${item.product_id}`)} className="flex-shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={createPageUrl(`ProductDetail?id=${item.product_id}`)}>
                    <h3 className="font-medium text-gray-800 hover:text-[#1B3A6B] transition-colors text-sm sm:text-base leading-tight line-clamp-2">{item.product_name}</h3>
                  </Link>
                  <p className="text-sm sm:text-base font-bold text-[#1B3A6B] mt-1">₵{item.product_price?.toFixed(2)}</p>

                  <div className="flex items-center justify-between mt-2 sm:mt-3">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => updateQuantityMutation.mutate({ item, delta: -1 })}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => updateQuantityMutation.mutate({ item, delta: 1 })}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 sm:px-3" onClick={() => removeItemMutation.mutate(item)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Remove</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Proceed to Checkout */}
        <div className="flex justify-center">
          <div className="w-full max-w-2xl space-y-3">
            <Button
              className="w-full bg-[#1B3A6B] hover:bg-[#162f58] text-white font-bold py-3"
              onClick={() => {
                if (!user) { navigate(createPageUrl('Login')); return; }
                navigate(createPageUrl('Checkout'));
              }}
            >
              Proceed To Checkout
            </Button>
            <Link to={createPageUrl('Shop')}>
              <Button variant="ghost" className="w-full mt-2">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
