import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Badge } from "@/components/ui/badge";
import { Star } from 'lucide-react';

export default function ProductCard({ product }) {
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const stockLeft = product.stock ?? null;
  const isOutOfStock = stockLeft === 0;

  // Stock bar color
  const stockPercent = stockLeft != null && stockLeft <= 20
    ? Math.max(5, Math.round((stockLeft / 20) * 100))
    : 100;

  const stockBarColor =
    stockLeft <= 5 ? 'bg-red-500' :
    stockLeft <= 10 ? 'bg-orange-400' :
    'bg-yellow-400';

  return (
    <Link
      to={createPageUrl(`ProductDetail?id=${product.id}`)}
      className="block group"
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={product.image_url || 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=400'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded">
              -{discount}%
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-full">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 flex flex-col gap-1 flex-1">
          {/* Product name */}
          <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
            <span className="text-base font-black text-gray-900">
              ₵{product.price?.toFixed(2)}
            </span>
            {product.original_price && (
              <span className="text-xs text-gray-400 line-through">
                ₵{product.original_price?.toFixed(2)}
              </span>
            )}
          </div>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-gray-500">{product.rating?.toFixed(1)}</span>
            </div>
          )}

          {/* Stock */}
          {stockLeft != null && stockLeft > 0 && (
            <div className="mt-auto pt-1">
              <p className="text-xs text-gray-500 mb-1">
                {stockLeft} item{stockLeft !== 1 ? 's' : ''} left
              </p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${stockBarColor}`}
                  style={{ width: `${stockPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}