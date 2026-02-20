import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Truck, Shield, Clock, CreditCard, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import HeroBanner from '../components/home/HeroBanner';
import ProductRow from '../components/home/ProductRow';
import CategoryCard from '../components/products/CategoryCard';

const ALL_CATEGORIES = [
  'phones', 'phone_cases', 'chargers', 'earphones', 'cables', 'power_banks',
  'screen_protectors', 'holders', 'speakers', 'smart_watches', 'electronic_appliances', 'home_appliances'
];

const features = [
  { icon: Truck, title: 'Fast Delivery', desc: 'Across Ghana' },
  { icon: Shield, title: 'Quality', desc: '100% authentic' },
  { icon: Clock, title: 'Live Support', desc: 'AI assistant 24/7' },
  { icon: CreditCard, title: 'Paystack', desc: 'Mobile Money & Card' },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      }
    };
    getUser();
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
  });

  const addToCartMutation = useMutation({
    mutationFn: async (product) => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      const existingItems = await base44.entities.CartItem.filter({
        user_email: user.email,
        product_id: product.id
      });
      if (existingItems.length > 0) {
        await base44.entities.CartItem.update(existingItems[0].id, {
          quantity: existingItems[0].quantity + 1
        });
      } else {
        await base44.entities.CartItem.create({
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          product_price: product.price,
          quantity: 1,
          user_email: user.email
        });
      }
      // Deduct stock
      if (product.stock != null) {
        await base44.entities.Product.update(product.id, {
          stock: Math.max(0, product.stock - 1)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Added to cart!');
    }
  });

  const featuredProducts = products.filter(p => p.featured);
  const phoneProducts = products.filter(p => p.category === 'phones' || p.category === 'phone_cases' || p.category === 'chargers' || p.category === 'earphones' || p.category === 'cables' || p.category === 'screen_protectors' || p.category === 'power_banks' || p.category === 'holders');
  const electronicsProducts = products.filter(p => p.category === 'electronic_appliances' || p.category === 'speakers' || p.category === 'smart_watches');
  const homeProducts = products.filter(p => p.category === 'home_appliances');

  return (
    <div className="pb-4 bg-gray-100 min-h-screen">
      {/* Hero Slider */}
      <HeroBanner />

      {/* Features Bar */}
      <div className="bg-white border-b mb-3">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-around">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-center">
                <div className="p-1.5 rounded-full bg-orange-100 flex-shrink-0">
                  <f.icon className="h-4 w-4 text-orange-600" />
                </div>
                <div className="hidden md:block">
                  <p className="font-semibold text-gray-800 text-xs">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
                <p className="md:hidden text-[10px] text-gray-600 font-medium leading-tight">{f.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Icons */}
      <div className="bg-white rounded-xl shadow-sm mx-3 mb-3 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-bold text-gray-800">Shop by Category</h2>
          <Link to={createPageUrl('Categories')} className="text-orange-600 text-xs font-semibold hover:underline flex items-center">
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {ALL_CATEGORIES.map((cat, i) => {
            const categoryProduct = products.find(p => p.category === cat);
            return (
              <CategoryCard
                key={cat}
                category={cat}
                index={i}
                productImage={categoryProduct?.image_url}
              />
            );
          })}
        </div>
      </div>

      {/* Featured Products Row */}
      {(isLoading || featuredProducts.length > 0) && (
        <div className="mx-3">
          <ProductRow
            title="🏆 Top Selling Items"
            products={featuredProducts}
            isLoading={isLoading}
            viewAllLink={createPageUrl('Shop?featured=true')}
            onAddToCart={(p) => addToCartMutation.mutate(p)}
          />
        </div>
      )}

      {/* Phone Accessories Row */}
      <div className="mx-3">
        <ProductRow
          title="🔥 Flash Sale Deals"
          products={phoneProducts}
          isLoading={isLoading}
          viewAllLink={createPageUrl('Shop?category=phones')}
          onAddToCart={(p) => addToCartMutation.mutate(p)}
        />
      </div>

      {/* Electronics Row */}
      <div className="mx-3">
        <ProductRow
          title="✨ New Arrivals"
          products={electronicsProducts}
          isLoading={isLoading}
          viewAllLink={createPageUrl('Shop?category=electronic_appliances')}
          onAddToCart={(p) => addToCartMutation.mutate(p)}
        />
      </div>

      {/* Home Appliances Row */}
      {(isLoading || homeProducts.length > 0) && (
        <div className="mx-3">
          <ProductRow
            title="🏠 Home Appliances"
            products={homeProducts}
            isLoading={isLoading}
            viewAllLink={createPageUrl('Shop?category=home_appliances')}
            onAddToCart={(p) => addToCartMutation.mutate(p)}
          />
        </div>
      )}

      {/* All Products Row */}
      <div className="mx-3">
        <ProductRow
          title="🛍️ All Products"
          products={products}
          isLoading={isLoading}
          viewAllLink={createPageUrl('Shop')}
          onAddToCart={(p) => addToCartMutation.mutate(p)}
        />
      </div>

      {/* Promo Banner */}
      <div className="mx-3 mb-4">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl overflow-hidden p-6 md:p-10 relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[url('https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800')] bg-cover bg-center opacity-10" />
          <div className="relative max-w-md">
            <span className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">Limited Offer</span>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
              Get the Best Deals on FMM CLASSICO
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Premium phone accessories, electronics & home appliances in Tarkwa, UMAT Campus & Accra.
            </p>
            <Link to={createPageUrl('Shop')}>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
                Start Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}