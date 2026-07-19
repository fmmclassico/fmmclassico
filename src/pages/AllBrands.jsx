import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Gem } from 'lucide-react';
import { getBrandLogo, getBrandProductCount, getVisibleBrandDirectory } from '@/lib/brandDirectory';

export default function AllBrands() {
  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        const result = await base44.entities.AppSetting.list();
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Product.list('-created_date', 500);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  const settings = Array.isArray(appSettings) ? appSettings : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const brands = getVisibleBrandDirectory(settings, safeProducts);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-4xl px-4 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A2E60]">
            <Gem className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">All Brands</h1>
            <p className="text-xs text-gray-500">{brands.length} brands available</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
          {brands.map((brand) => {
            const logoSrc = getBrandLogo(settings, brand.key);
            const productCount = getBrandProductCount(safeProducts, brand);
            return (
              <Link
                key={brand.key}
                to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand.sourceName)}`)}
                className="group flex flex-col items-center gap-2 rounded-xl border bg-white p-4 transition-all hover:border-[#0A2E60]/40 hover:shadow-md"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-gray-50 transition-transform group-hover:scale-105">
                  {logoSrc ? (
                    <img src={logoSrc} alt={brand.displayName} className="h-10 w-10 object-contain" />
                  ) : (
                    <span className="text-lg font-bold text-gray-400">{(brand.displayName || brand.sourceName)[0]}</span>
                  )}
                </div>
                {brand.showName !== false && <span className="text-center text-xs font-medium text-gray-700">{brand.displayName}</span>}
                {productCount > 0 && <span className="text-[10px] text-gray-400">{productCount} items</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
