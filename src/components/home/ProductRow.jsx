import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../products/ProductCard';
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductRow({ title, products, isLoading, viewAllLink }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b">
        <h2 className="text-base md:text-lg font-bold text-gray-800">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-orange-600 text-xs font-semibold hover:underline flex items-center">
            See All <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Scrollable Row */}
      <div className="relative group">
        <button
          onClick={() => scroll(-1)}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 p-4 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading
            ? Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-36 md:w-44 space-y-2">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            : products.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-36 md:w-44">
                  <ProductCard
                    product={product}
                    onAddToCart={() => onAddToCart?.(product)}
                  />
                </div>
              ))}
        </div>

        <button
          onClick={() => scroll(1)}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}