import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import OptimizedImage from '../ui/optimized-image';

export default function ProductCard({ product }) {
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const stockLeft = product.stock ?? null;
  const isOutOfStock = stockLeft === 0;

  const stockPercent = stockLeft != null && stockLeft > 0
    ? Math.min(100, Math.max(5, Math.round((Math.min(stockLeft, 20) / 20) * 100)))
    : 0;

  const stockBarColor =
    stockLeft <= 3 ? 'bg-red-500' :
    stockLeft <= 8 ? 'bg-orange-400' :
    'bg-yellow-400';

  return (
    <Link
      to={createPageUrl(`Product?id=${product.id}`)}
      className="block bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative">
        {/* Image with shimmer placeholder */}
        <OptimizedImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full"
          containerClassName="w-full aspect-square bg-gray-100"
          objectFit="cover"
        />

        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discount}%
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-xs bg-black/60 px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-tight min-h-[32px]">
          {product.name}
        </p>

        <p className="text-sm font-extrabold text-gray-900 mt-1">
          ₵{product.price?.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>

        {product.original_price && (
          <p className="text-[11px] text-gray-400 line-through">
            ₵{product.original_price?.toFixed(2)}
          </p>
        )}

        {stockLeft != null && stockLeft > 0 && (
          <div className="mt-1.5">
            <p className="text-[10px] text-gray-500 font-medium">
              {stockLeft} item{stockLeft !== 1 ? 's' : ''} left
            </p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-0.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${stockBarColor} transition-all`}
                style={{ width: `${stockPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
