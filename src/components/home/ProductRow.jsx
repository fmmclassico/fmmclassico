import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../products/ProductCard';
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductRow({ title, products, isLoading, viewAllLink, layout = 'scroll' }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 180, behavior: 'smooth' });
    }
  };

  const displayProducts = products.slice(0, layout === 'grid' ? 10 : products.length);

  return (
    <div className="bg-white rounded-none md:rounded-xl shadow-sm mb-2 overflow-hidden">
      {/* Header — Jumia style: colored left border accent */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <h2 className="text-[14px] md:text-base font-extrabold text-gray-900 uppercase tracking-tight">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-orange-500 text-[11px] font-bold hover:underline flex items-center border border-orange-400 rounded px-2 py-0.5">
            SEE ALL <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {layout === 'grid' ? (
        /* 2-column grid — Jumia mobile style */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100">
          {isLoading
            ? Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white p-2 space-y-2">
                  <Skeleton className="aspect-square rounded" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            : displayProducts.map((product) => (
                <div key={product.id} className="bg-white">
                  <ProductCard product={product} />
                </div>
              ))}
        </div>
      ) : (
        /* Horizontal scroll row */
        <div className="relative group">
          <button
            onClick={() => scroll(-1)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-px bg-gray-100 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {isLoading
              ? Array(6).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[47vw] md:w-48 bg-white space-y-2 p-2">
                    <Skeleton className="aspect-square rounded" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              : displayProducts.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-[47vw] md:w-48 bg-white">
                    <ProductCard product={product} />
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
      )}
    </div>
  );
}