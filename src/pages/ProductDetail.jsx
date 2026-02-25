import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingCart, 
  Star, 
  Truck, 
  Shield, 
  RotateCcw, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Share2,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const categoryNames = {
  phone_cases: 'Phone Cases',
  chargers: 'Chargers',
  earphones: 'Earphones',
  cables: 'Cables',
  power_banks: 'Power Banks',
  screen_protectors: 'Screen Protectors',
  holders: 'Holders & Mounts',
  speakers: 'Speakers',
  smart_watches: 'Smart Watches',
  electronic_appliances: 'Electronic Appliances',
  home_appliances: 'Home Appliances',
};

export default function ProductDetail() {
  const [user, setUser] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

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
    queryFn: () => base44.entities.Product.list(),
  });

  const product = products.find(p => p.id === productId);

  // Build image gallery array
  const allImages = product ? [
    product.image_url,
    ...(product.image_urls || [])
  ].filter(Boolean).slice(0, 4) : [];

  // If less than 4 images, use the main image as fallback
  while (allImages.length < 4 && product?.image_url) {
    allImages.push(product.image_url);
  }

  const addToCartMutation = useMutation({
    mutationFn: async () => {
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
          quantity: existingItems[0].quantity + quantity
        });
      } else {
        await base44.entities.CartItem.create({
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          product_price: product.price,
          quantity: quantity,
          user_email: user.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      toast.success('Added to cart!');
    }
  });

  const discount = product?.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Product not found</h2>
        <Link to={createPageUrl('Shop')}>
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={createPageUrl('Home')} className="hover:text-orange-600">Home</Link>
        <span>/</span>
        <Link to={createPageUrl(`Shop?category=${product.category}`)} className="hover:text-orange-600">
          {categoryNames[product.category]}
        </Link>
        <span>/</span>
        <span className="text-gray-800">{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Image Gallery */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Main Image with Navigation */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-lg">
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedImageIndex}
                src={allImages[selectedImageIndex] || 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=800'}
                alt={product.name}
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </AnimatePresence>
            
            {discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-red-500 hover:bg-red-500 text-white text-lg px-3 py-1">
                -{discount}%
              </Badge>
            )}
            
            {/* Swipe dots only - no nav arrows */}
            
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button size="icon" variant="secondary" className="rounded-full shadow-md">
                <Heart className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="secondary" className="rounded-full shadow-md">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Thumbnail Gallery */}
          <div className="grid grid-cols-4 gap-2">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImageIndex === idx 
                    ? 'border-orange-500 shadow-md' 
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img
                  src={img}
                  alt={`${product.name} view ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Product Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div>
            <Badge variant="outline" className="mb-2">{categoryNames[product.category]}</Badge>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[1,2,3,4,5].map(i => (
                  <Star 
                    key={i} 
                    className={`h-5 w-5 ${i <= (product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
              <span className="text-gray-600">({product.reviews_count || 0} reviews)</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-orange-600">₵{product.price?.toFixed(2)}</span>
            {product.original_price && (
              <span className="text-xl text-gray-400 line-through">₵{product.original_price?.toFixed(2)}</span>
            )}
          </div>

          {product.description && (
            <details className="group border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer font-semibold text-gray-700 select-none list-none">
                <span>Product Details</span>
                <span className="text-orange-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 py-3 text-gray-600 leading-relaxed text-sm">{product.description}</div>
            </details>
          )}

          <div className="flex items-center gap-4">
            <span className="text-gray-600 font-medium">Quantity:</span>
            <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {product.stock && (
              <span className="text-sm text-gray-500">{product.stock} in stock</span>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
              size="lg" 
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg"
              onClick={() => addToCartMutation.mutate()}
              disabled={addToCartMutation.isPending}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-3 pt-4 border-t">
            <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
              <Shield className="h-6 w-6 text-orange-500 mb-2" />
              <span className="text-xs font-medium text-gray-600">Genuine Product</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}