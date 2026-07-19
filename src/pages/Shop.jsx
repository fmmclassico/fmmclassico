import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, Grid3X3, LayoutList, X } from 'lucide-react';
import ProductCard from '../components/products/ProductCard';

const categoryNames = {
  phones: 'Phones',
  phone_cases: 'Phone Cases',
  chargers: 'Chargers',
  earphones: 'Earphones',
  cables: 'Cables',
  power_banks: 'Power Banks',
  screen_protectors: 'Screen Protectors',
  holders: 'Holders & Mounts',
  speakers: 'Speakers',
  smart_watches: 'Smart Watches',
  electronic_appliances: 'Electronics',
  home_appliances: 'Home Appliances',
};

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const rawCategory = searchParams.get('category') || '';
  const category = rawCategory.replace(/^\//, '') || null;
  const subcategory = searchParams.get('sub');
  const search = searchParams.get('search');
  const featured = searchParams.get('featured');

  const { data: allProducts = [], isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    gcTime: 10 * 60 * 1000,
  });

  React.useEffect(() => {
    refetch();
  }, [category, subcategory, search, featured, refetch]);

  const filteredProducts = useMemo(() => {
    let products = [...allProducts].filter((product) => product.is_visible !== false && !(product.stock != null && product.stock === 0));

    if (category) {
      products = products.filter((product) => product.category === category);
    }

    if (subcategory) {
      const wantedSub = decodeURIComponent(subcategory).trim();
      const wantedSlug = slugify(wantedSub);

      products = products.filter((product) => {
        const productSub = String(product.subcategory || '').trim();
        if (!productSub) return false;
        return productSub.toLowerCase() === wantedSub.toLowerCase() || slugify(productSub) === wantedSlug;
      });
    }

    if (featured === 'true') {
      products = products.filter((product) => product.featured);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter((product) =>
        product.name?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower)
      );
    }

    switch (sortBy) {
      case 'price_low':
        products.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case 'price_high':
        products.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case 'rating':
        products.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        break;
      case 'newest':
      default:
        products.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
        break;
    }

    return products;
  }, [allProducts, category, subcategory, featured, search, sortBy]);

  const clearFilters = () => {
    setSearchParams({});
    setSortBy('newest');
    setViewMode('grid');
  };

  

  const pageTitle = subcategory
    ? decodeURIComponent(subcategory)
    : category
      ? categoryNames[category] || category
      : search
        ? `Results for "${search}"`
        : featured === 'true'
          ? 'Featured Products'
          : 'All Products';

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
  <h1 className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">{pageTitle}</h1>

  <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
    <SheetTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        aria-label="Open filters"
        className="h-10 w-10 rounded-full border-gray-300 shrink-0"
      >
        <Filter className="h-4 w-4" />
      </Button>
    </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white">
                  <option value="newest">Newest</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">View Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${viewMode === 'grid' ? 'bg-[#0A2E60] text-white border-[#0A2E60]' : 'bg-white text-gray-700 border-gray-200'}`}
                  >
                    <Grid3X3 className="h-4 w-4 mx-auto mb-1" /> Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${viewMode === 'list' ? 'bg-[#0A2E60] text-white border-[#0A2E60]' : 'bg-white text-gray-700 border-gray-200'}`}
                  >
                    <LayoutList className="h-4 w-4 mx-auto mb-1" /> List
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={clearFilters}>Clear Filters</Button>
                <Button className="flex-1 rounded-xl bg-[#0A2E60] hover:bg-[#082449]" onClick={() => setFiltersOpen(false)}>Done</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activeFilters.map((filter) => (
            <span key={filter} className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
              {filter}
            </span>
          ))}
          <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-medium text-red-600">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-1'}`}>
        {isLoading ? (
          Array(10).fill(0).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>

      {{filteredProducts.length === 0 && !isLoading && (
  <div className="text-center py-16 bg-white border rounded-xl">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
      <Filter className="h-8 w-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-800">No products found</h3>
  </div>
)}
    </div>
  );
}
