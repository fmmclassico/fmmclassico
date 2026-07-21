import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton";
import { Gem } from 'lucide-react';

const DEFAULT_BRANDS = [
  { name: 'Apple', fallback: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
  { name: 'Samsung', fallback: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
  { name: 'Tecno', fallback: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/TECNO_Mobile_Logo.svg' },
  { name: 'Infinix', fallback: '' },
  { name: 'Itel', fallback: '' },
  { name: 'Hisense', fallback: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Hisense_logo.svg' },
  { name: 'TCL', fallback: 'https://upload.wikimedia.org/wikipedia/commons/1/16/TCL_Logo.svg' },
  { name: 'Oraimo', fallback: 'https://play-lh.googleusercontent.com/3f4sJfJMJc5Y8mWj4LYl_aSiZ0sGOnJ9iuSqlMzNFJELBPJqBDYQfuCpkJn3RNHanA=s180' },
  { name: 'Sony', fallback: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg' },
  { name: 'JBL', fallback: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/JBL_logo.svg' },
  { name: 'Roch', fallback: '' },
  { name: 'Silver Crest', fallback: '' },
  { name: 'Nasco', fallback: '' },
  { name: 'Hoffman', fallback: '' },
  { name: 'LG', fallback: '' },
  { name: 'Midea', fallback: '' },
];

export default function AllBrands() {
  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        const result = await appClient.entities.AppSetting.list();
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (e) { return []; }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const result = await appClient.entities.Product.list('-created_date', 200);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (e) { return []; }
    },
    staleTime: 60000,
  });

  const settings = Array.isArray(appSettings) ? appSettings : [];
  const safeProducts = Array.isArray(products) ? products : [];

  // Get admin brand list or use defaults
  const adminBrandListRaw = settings.find(s => s.key === 'brand_list')?.value;
  let adminBrands = null;
  if (adminBrandListRaw) {
    try { adminBrands = JSON.parse(adminBrandListRaw); } catch (e) {}
  }

  // Build brand list
  let brands = DEFAULT_BRANDS;
  if (adminBrands && Array.isArray(adminBrands)) {
    brands = adminBrands.filter(b => b.visible !== false);
  }

  // Also discover brands from products that aren't in the default list
  const productBrands = [...new Set(safeProducts.filter(p => p.brand && p.is_visible !== false).map(p => p.brand))];
  productBrands.forEach(pb => {
    if (!brands.find(b => b.name.toLowerCase() === pb.toLowerCase())) {
      brands.push({ name: pb, fallback: '' });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#0A2E60] flex items-center justify-center">
            <Gem className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">All Brands</h1>
            <p className="text-xs text-gray-500">{brands.length} brands available</p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {brands.map(brand => {
            const uploadedLogo = settings.find(s => s.key === `brand_logo_${brand.name.toLowerCase().replace(/ /g, '_')}`)?.value;
            const logoSrc = uploadedLogo || brand.fallback;
            const productCount = safeProducts.filter(p => p.brand?.toLowerCase() === brand.name.toLowerCase() && p.is_visible !== false).length;

            return (
              <Link
                key={brand.name}
                to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand.name)}`)}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border hover:border-[#0A2E60]/40 hover:shadow-md transition-all group"
              >
                <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                  {logoSrc ? (
                    <img src={logoSrc} alt={brand.name} className="w-10 h-10 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span className="text-lg font-bold text-gray-400">{brand.name[0]}</span>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700 text-center">{brand.name}</span>
                {productCount > 0 && <span className="text-[10px] text-gray-400">{productCount} items</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
