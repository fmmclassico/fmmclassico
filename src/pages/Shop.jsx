import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Filter, Grid3X3, LayoutList, X } from 'lucide-react';
import { toast } from 'sonner';
import ProductCard from '../components/products/ProductCard';

const categoryNames = {
  phone_cases: 'Phone Cases',
  chargers: 'Chargers',
  earphones: 'Earphones',
  cables: 'Cables',
  power_banks: 'Power Banks',
  screen_protectors: 'Screen Protectors',
  holders: 'Holders & Mounts',
  speakers: 'Speakers',
};

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const queryClient = useQueryClient();

  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const featured = searchParams.get('featured');

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      }
    };
    getUser();
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
  });

  const addToCartMutation = useMutation({
    mutationFn: async (product) => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      const existingItems = await base44.entities.CartItem.filter({ 
        user_email: user.email, 
        product_id: product.id 
      });
      
      if (existingItems.length > 0) {
        await base44.entities.CartItem.update(existingItems[0].id, {
          quantity: existingItems[0].quantity + 1
        });
      } else {
        await base44.entities.CartItem.create({
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          product_price: product.price,
          quantity: 1,
          user_email: user.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      toast.success('Added to cart!');
    }
  });

  let filteredProducts = [...allProducts];

  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }

  if (featured === 'true') {
    filteredProducts = filteredProducts.filter(p => p.featured);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredProducts = filteredProducts.filter(p => 
      p.name?.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower)
    );
  }

  // Sort products
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
  };

  const hasFilters = category || search || featured;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          {category ? categoryNames[category] : search ? `Results for "${search}"` : featured ? 'Featured Products' : 'All Products'}
        </h1>
        <p className="text-gray-500">{filteredProducts.length} products found</p>
      </div>

      {/* Active Filters */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {category && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              {categoryNames[category]}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500" 
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('category');
                  setSearchParams(newParams);
                }}
              />
            </Badge>
          )}
          {search && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              Search: {search}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500" 
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('search');
                  setSearchParams(newParams);
                }}
              />
            </Badge>
          )}
          {featured && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              Featured
              <X 
                className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500" 
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('featured');
                  setSearchParams(newParams);
                }}
              />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-orange-600">
            Clear All
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 border-0 bg-gray-50">
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
        <div className="flex items-center gap-1">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Products Grid */}
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
            <ProductCard 
              key={product.id} 
              product={product}
              onAddToCart={() => addToCartMutation.mutate(product)}
            />
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