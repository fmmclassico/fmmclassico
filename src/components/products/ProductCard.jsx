import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

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
    <Link to={createPageUrl(`ProductDetail?id=${product.id}`)} className="block">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">

        {/* Image */}
        <div className="relative w-full aspect-square bg-white overflow-hidden">
          <img
            src={product.image_url || 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=400'}
            alt={product.name}
            className="w-full h-full object-contain p-1"

          />
          {discount > 0 && (
            <div className="absolute top-1.5 right-1.5 bg-blue-50 border border-blue-200 text-[#2E86C1] text-[11px] font-extrabold px-1.5 py-0.5 rounded">
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
        <div className="px-2.5 pt-2 pb-3 flex flex-col gap-1 flex-1">
          {/* Product name — like Jumia: medium weight, truncated */}
          <p className="text-[13px] font-medium text-gray-700 leading-snug line-clamp-2" style={{ minHeight: '2.4rem' }}>
            {product.name}
          </p>

          {/* Price — like Jumia: very bold, large, dark */}
          <p className="text-[15px] font-black text-gray-900 leading-tight mt-0.5">
            ₵{product.price?.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          {product.original_price && (
            <p className="text-[11px] text-gray-400 line-through -mt-0.5">
              ₵{product.original_price?.toFixed(2)}
            </p>
          )}

          {/* Stock — like Jumia: "X items left" + progress bar */}
          {stockLeft != null && stockLeft > 0 && (
            <div className="mt-auto pt-2">
              <p className="text-[12px] text-gray-500 font-medium mb-1">
                {stockLeft} item{stockLeft !== 1 ? 's' : ''} left
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${stockBarColor} transition-all duration-300`}
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