import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Truck, Shield, Clock, CreditCard, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ProductCard from '../components/products/ProductCard';
import CategoryCard from '../components/products/CategoryCard';

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
    queryFn: () => base44.entities.Product.list('-created_date', 20),
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      toast.success('Added to cart!');
    }
  });

  const featuredProducts = products.filter(p => p.featured);
  const categories = ['phone_cases', 'chargers', 'earphones', 'cables', 'power_banks', 'screen_protectors', 'holders', 'speakers', 'smart_watches', 'electronic_appliances', 'home_appliances'];

  const features = [
    { icon: Truck, title: 'Free Delivery', desc: 'On UMAT Campus only' },
    { icon: Shield, title: 'Quality Guarantee', desc: '100% authentic products' },
    { icon: Clock, title: '24/7 Support', desc: 'Always here to help' },
    { icon: CreditCard, title: 'Secure Payment', desc: 'Safe transactions' },
  ];

  return (
    <div className="pb-6">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1200')] bg-cover bg-center opacity-20" />
        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <Badge className="bg-white/20 text-white hover:bg-white/30 mb-4">New Arrivals 🔥</Badge>
            <h1 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight">
              Premium Phone Accessories, Electronic Appliances & Home Appliances
            </h1>
            <p className="text-base md:text-lg text-white/90 mb-6">
              Discover the latest phone cases, chargers, earphones, smart watches, electronics and home appliances at unbeatable prices.
            </p>
            <div className="flex gap-3">
              <Link to={createPageUrl('Shop')}>
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg">
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to={createPageUrl('Categories')}>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
                  Browse Categories
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="p-2 rounded-full bg-orange-100">
                  <feature.icon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{feature.title}</p>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories - Using Featured Products */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Shop by Category</h2>
          <Link to={createPageUrl('Categories')} className="text-orange-600 hover:text-orange-700 font-medium flex items-center text-sm">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-3">
          {categories.map((cat, i) => {
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
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Featured Products</h2>
            <Link to={createPageUrl('Shop?featured=true')} className="text-orange-600 hover:text-orange-700 font-medium flex items-center text-sm">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : (
              featuredProducts.slice(0, 5).map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  onAddToCart={() => addToCartMutation.mutate(product)}
                />
              ))
            )}
          </div>
        </section>
      )}

      {/* All Products */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Latest Products</h2>
          <Link to={createPageUrl('Shop')} className="text-orange-600 hover:text-orange-700 font-medium flex items-center text-sm">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {isLoading ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : (
            products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product}
                onAddToCart={() => addToCartMutation.mutate(product)}
              />
            ))
          )}
        </div>
        
        {products.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products available yet. Check back soon!</p>
          </div>
        )}
      </section>

      {/* Promo Banner */}
      <section className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl overflow-hidden p-8 md:p-12"
        >
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[url('https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800')] bg-cover bg-center opacity-20" />
          <div className="relative max-w-lg">
            <Badge className="bg-orange-500 hover:bg-orange-500 mb-4">Limited Offer</Badge>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Get 20% Off Your First Order
            </h3>
            <p className="text-gray-300 mb-6">
              Sign up now and receive exclusive discounts on premium phone accessories.
            </p>
            <Link to={createPageUrl('Shop')}>
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
                Start Shopping
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}