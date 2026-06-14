import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight,
  ShoppingBag,
  Truck,
  ChevronDown,
  MapPin,
  X
} from 'lucide-react';

import { toast } from 'sonner';

export default function Cart() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: () => base44.entities.CartItem.filter({ user_email: user?.email }),
    enabled: !!user?.email
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ item, delta }) => {
      const newQty = item.quantity + delta;
      if (newQty < 1) {
        await base44.entities.CartItem.delete(item.id);
      } else {
        await base44.entities.CartItem.update(item.id, { quantity: newQty });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: async (item) => {
      await base44.entities.CartItem.delete(item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      toast.success('Item removed');
    }
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);

  const deliveryZones = [
    { id: 'umat_pickup', label: '🏫 UMAT Campus – Pickup / Meeting Point', fee: 0, note: 'FREE – collect on campus' },
    { id: 'umat_doorstep', label: '🏠 UMAT Campus – Doorstep Delivery', fee: 10, note: '₵10 to your door' },
    { id: 'tarkwa_station', label: '🚌 Tarkwa – Delivery to a Station / Car', fee: 20, note: '₵20 to a station or car' },
    { id: 'tarkwa', label: '🏘️ Tarkwa (Outside UMAT) – Doorstep', fee: 25, note: '₵25 delivery fee' },
    { id: 'ashongman', label: '🏠 Ashongman Estate – Pickup Point (Close to Awo Dede – Purewater)', fee: 0, note: 'FREE – pickup from our location' },
    { id: 'airport', label: '🏠 Airport Residential Area – Pickup Point (Libi Kraal)', fee: 0, note: 'FREE – pickup from our location' },
    { id: 'accra_station', label: '🚌 Accra – Delivery to a Station / Car', fee: 25, note: '₵25 to a station or car' },
    { id: 'accra_delivery', label: '🚗 Delivery Within Accra', fee: 25, note: '₵25 delivery fee' },
    { id: 'yango', label: '🛵 Yango Delivery – Pay on Delivery', fee: 0, note: 'Yango rider fee paid when product arrives' },
    { id: 'uber', label: '🚗 Uber Delivery – Pay on Delivery', fee: 0, note: 'Uber rider fee paid when product arrives' },
    { id: 'bolt', label: '⚡ Bolt Delivery – Pay on Delivery', fee: 0, note: 'Bolt rider fee paid when product arrives' },
    { id: 'other', label: '📦 Outside Accra & Tarkwa', fee: 50, note: '₵50 flat rate' },
  ];

  const selectedZone = deliveryZones.find(z => z.id === selectedLocation);
  const shipping = selectedZone ? selectedZone.fee : 0;
  const total = subtotal + shipping;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (cartItems.length === 0 && !isLoading) {
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

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <>
            {cartItems.map((item) => (
              <div key={item.id}>
                <Card className="p-3 sm:p-4 shadow-sm">
                  <div className="flex gap-3">
                    <Link to={createPageUrl(`ProductDetail?id=${item.product_id}`)} className="flex-shrink-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100">
                        <img
                         src={item.product_image}
                         alt={item.product_name}
                         className="w-full h-full object-cover"
                         onError={e => { e.target.style.display='none'; }}
                        />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={createPageUrl(`ProductDetail?id=${item.product_id}`)}>
                        <h3 className="font-medium text-gray-800 hover:text-[#1B3A6B] transition-colors text-xs sm:text-sm leading-tight line-clamp-2">
                          {item.product_name}
                        </h3>
                      </Link>
                      <p className="text-sm sm:text-base font-bold text-[#1B3A6B] mt-1">
                        ₵{item.product_price?.toFixed(2)}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2 sm:mt-3">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 rounded-full"
                            onClick={() => updateQuantityMutation.mutate({ item, delta: -1 })}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 rounded-full"
                            onClick={() => updateQuantityMutation.mutate({ item, delta: 1 })}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 sm:px-3"
                          onClick={() => removeItemMutation.mutate(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">Remove</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-4 sm:p-6 shadow-md lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>₵{subtotal.toFixed(2)}</span>
              </div>

              {/* Delivery Location Picker */}
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Truck className="h-4 w-4 text-[#1B3A6B]" />
                  <span className="text-sm font-semibold text-gray-700">Delivery / Pickup</span>
                </div>
                <button
                  onClick={() => setLocationPickerOpen(o => !o)}
                  className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    {selectedZone ? (
                      <>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800 break-words leading-snug">{selectedZone.label}</p>
                        <p className="text-xs text-[#1B3A6B] mt-0.5">{selectedZone.note}</p>
                      </>
                    ) : (
                      <p className="text-xs sm:text-sm text-[#1B3A6B] font-medium">📍 Tap to pick your location</p>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-[#1B3A6B] flex-shrink-0 transition-transform ${locationPickerOpen ? 'rotate-180' : ''}`} />
                </button>

                {locationPickerOpen && (
                  <div className="mt-1 border border-gray-200 rounded-xl shadow-lg bg-white overflow-hidden max-h-60 overflow-y-auto z-10 relative">
                    {deliveryZones.map(zone => (
                      <button
                        key={zone.id}
                        onClick={() => { setSelectedLocation(zone.id); setLocationPickerOpen(false); }}
                        className={`w-full flex items-start justify-between px-3 py-2.5 hover:bg-blue-50 text-left border-b border-gray-100 last:border-0 transition-colors ${selectedLocation === zone.id ? 'bg-blue-50 border-l-4 border-l-[#1B3A6B]' : ''}`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs sm:text-sm font-medium text-gray-800 leading-snug">{zone.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{zone.note}</p>
                        </div>
                        <span className={`text-xs sm:text-sm font-bold flex-shrink-0 ${zone.fee === 0 ? 'text-green-600' : 'text-[#1B3A6B]'}`}>
                          {zone.fee === 0 ? 'FREE' : `₵${zone.fee}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span className={selectedZone && shipping === 0 ? 'text-green-600 font-semibold' : ''}>
                  {selectedZone ? (shipping === 0 ? 'FREE' : `₵${shipping}`) : '—'}
                </span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold text-gray-800">
                <span>Total</span>
                <span>₵{total.toFixed(2)}</span>
              </div>
              {!selectedZone && (
                <p className="text-xs text-center text-[#1B3A6B]">Select your location above to see final total</p>
              )}
            </div>

            <div className="flex justify-center">
              <Button 
                className={`w-full max-w-sm mt-4 sm:mt-6 font-bold py-4 sm:py-6 text-base sm:text-lg ${selectedZone ? 'bg-[#1B3A6B] hover:bg-[#162f58] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                disabled={!selectedZone}
                onClick={() => {
                  if (!selectedZone) {
                    toast.error('Please select your delivery location first');
                    return;
                  }
                  const params = `?zone=${selectedZone.id}&zoneName=${encodeURIComponent(selectedZone.label)}&fee=${selectedZone.fee}`;
                  navigate(createPageUrl('Checkout') + params);
                }}
              >
                💳 Place Order & Pay with Hubtel
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            {!selectedZone && (
            <p className="text-xs text-center text-[#1B3A6B] mt-2 font-medium">⚠️ Please select a delivery location to continue</p>
            )}

            <Link to={createPageUrl('Shop')}>
              <Button variant="ghost" className="w-full mt-2">
                Continue Shopping
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}