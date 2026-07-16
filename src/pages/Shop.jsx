import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  electronic_appliances: 'Electronic Appliances',
  home_appliances: 'Home Appliances',
};

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = searchParams.get('category');
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
  }, [category, search, featured, refetch]);

  let filteredProducts = allProducts.filter((product) => product.is_visible !== false && !(product.stock != null && product.stock === 0));

  if (category) {
    filteredProducts = filteredProducts.filter((product) => product.category === category);
  }

  if (featured === 'true') {
    filteredProducts = filteredProducts.filter((product) => product.featured);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredProducts = filteredProducts.filter((product) =>
      product.name?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower)
    );
  }

  switch (sortBy) {
    case 'price_low':
      filteredProducts.sort((a, b) => a.price - b.price);
      break;
    case 'price_high':
      filteredProducts.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'newest':
    default:
      break;
  }

  const clearFilters = () => {
    setSearchParams({});
    setSortBy('newest');
  };

  const activeFilters = [
    category ? `Category: ${categoryNames[category] || category}` : null,
    search ? `Search: ${search}` : null,
    featured ? 'Featured Only' : null,
    sortBy !== 'newest' ? `Sort: ${sortBy.replace('_', ' ')}` : null,
  ].filter(Boolean);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          {category ? categoryNames[category] : search ? `Results for "${search}"` : featured ? 'Featured Products' : 'All Products'}
        </h1>
        <p className="text-gray-500">{filteredProducts.length} products found</p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="rounded-full border-gray-300">
              <Filter className="h-4 w-4 mr-2" /> Filters & Sort
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Shop Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Top Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">View Mode</label>
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

        <div className="hidden md:flex items-center gap-1 rounded-full border bg-white p-1 shadow-sm">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-full" onClick={() => setViewMode('grid')}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-full" onClick={() => setViewMode('list')}>
            <LayoutList className="h-4 w-4" />
          </Button>
        </div>
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

      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Filter className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
          <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
        </div>
      )}
    </div>
  );
}
