import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductCard({ product, onAddToCart }) {
  const [scrollPos, setScrollPos] = useState(0);

  const discount = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const allImages = product ? [
    product.image_url,
    ...(product.image_urls || [])
  ].filter(Boolean) : [];

  const handleMouseMove = (e) => {
    if (allImages.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const idx = Math.min(Math.floor(pct * allImages.length), allImages.length - 1);
    setScrollPos(idx);
  };

  const currentImage = allImages[scrollPos] || allImages[0] || 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-0 shadow-sm">
        <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
          <div
            className="relative aspect-square overflow-hidden bg-gray-100"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setScrollPos(0)}
          >
            <img
              src={currentImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {allImages.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {allImages.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all ${i === scrollPos ? 'w-4 bg-white' : 'w-1 bg-white/60'}`} />
                ))}
              </div>
            )}
            {discount > 0 && (
              <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-500 text-white font-bold">
                -{discount}%
              </Badge>
            )}
            {product.featured && (
              <Badge className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-500 text-white">
                Featured
              </Badge>
            )}
            {product.stock != null && product.stock <= 5 && product.stock > 0 && (
              <Badge className="absolute bottom-2 right-2 bg-yellow-500 hover:bg-yellow-500 text-white text-[10px]">
                Only {product.stock} left
              </Badge>
            )}
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-white text-gray-800 text-xs font-bold px-2 py-1 rounded">Out of Stock</span>
              </div>
            )}
          </div>
        </Link>
        
        <div className="p-3">
          <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
            <h3 className="font-medium text-gray-800 text-sm line-clamp-2 hover:text-orange-600 transition-colors min-h-[40px]">
              {product.name}
            </h3>
          </Link>
          
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600">
              {product.rating?.toFixed(1) || '4.5'} ({product.reviews_count || 0})
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-orange-600">₵{product.price?.toFixed(2)}</span>
              {product.original_price && (
                <span className="text-xs text-gray-400 line-through">₵{product.original_price?.toFixed(2)}</span>
              )}
            </div>
            <Button
              size="icon"
              className="h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600 shadow-md"
              onClick={(e) => {
                e.preventDefault();
                onAddToCart?.(product);
              }}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}