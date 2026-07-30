import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton";
import { Gem } from 'lucide-react';
import { getVisibleBrandDirectory, getBrandLogoSources, getBrandProductCount } from '@/lib/brandDirectory';
import BrandLogoMark from '@/components/brands/BrandLogoMark';

export default function AllBrands() {
  const { data: appSettings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        const result = await appClient.entities.AppSetting.list();
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const result = await appClient.entities.Product.list('-created_date', 200);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 60000,
  });

  const settings = Array.isArray(appSettings) ? appSettings : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const brands = getVisibleBrandDirectory(settings, safeProducts).map((entry) => ({
    ...entry,
    logoSources: getBrandLogoSources(settings, entry.sourceName),
    productCount: getBrandProductCount(safeProducts, entry),
  }));
  const isLoading = settingsLoading || productsLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#0A2E60] flex items-center justify-center">
            <Gem className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">All Brands</h1>
            <p className="text-xs text-gray-500">{brands.length} brands available</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl border p-4 space-y-3">
                <Skeleton className="w-16 h-16 rounded-2xl mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.key}
                to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand.sourceName)}`)}
                className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:border-[#0A2E60]/40 hover:shadow-md transition-all group"
              >
                <BrandLogoMark
                  sources={brand.logoSources}
                  alt={brand.displayName}
                  fallbackLabel={brand.displayName.charAt(0)}
                  wrapperClassName="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-gray-100 flex items-center justify-center overflow-hidden p-2 shadow-sm group-hover:scale-105 transition-transform"
                  imageClassName="max-w-full max-h-full object-contain"
                  fallbackClassName="text-lg font-bold text-gray-400"
                />

                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{brand.displayName}</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {brand.productCount > 0
                      ? `${brand.productCount} product${brand.productCount === 1 ? '' : 's'}`
                      : 'No live products yet'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
