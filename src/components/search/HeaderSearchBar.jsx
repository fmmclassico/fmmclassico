import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HeaderSearchBar({
  createPageUrl,
  placeholder = 'Search products...',
  className = '',
  inputClassName = '',
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['header-search-products'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Product.list('-created_date', 150);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const formatCategoryLabel = (value) => {
    if (!value) return 'Product';
    return value
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const searchSuggestions = useMemo(() => {
    if (!normalizedSearchQuery) return [];

    return [...products]
      .filter((product) => product?.is_visible !== false)
      .filter((product) => {
        const name = product?.name?.toLowerCase() || '';
        const description = product?.description?.toLowerCase() || '';
        const category = product?.category?.toLowerCase() || '';
        return (
          name.includes(normalizedSearchQuery) ||
          description.includes(normalizedSearchQuery) ||
          category.includes(normalizedSearchQuery)
        );
      })
      .sort((a, b) => {
        const aStarts = a?.name?.toLowerCase().startsWith(normalizedSearchQuery) ? 1 : 0;
        const bStarts = b?.name?.toLowerCase().startsWith(normalizedSearchQuery) ? 1 : 0;
        return bStarts - aStarts;
      })
      .slice(0, 6);
  }, [normalizedSearchQuery, products]);

  const submitSearch = (rawValue = searchQuery) => {
    const value = rawValue.trim();
    if (!value) return;
    setSuggestionsOpen(false);
    navigate(createPageUrl(`Shop?search=${encodeURIComponent(value)}`));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    submitSearch(searchQuery);
  };

  const handleSuggestionSelect = (product) => {
    if (!product?.id) return;
    setSuggestionsOpen(false);
    navigate(createPageUrl(`ProductDetail?id=${product.id}`));
  };

  return (
    <form onSubmit={handleSearch} className={className}>
      <div className="relative w-full">
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSuggestionsOpen(true);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 140)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSuggestionsOpen(false);
          }}
          autoComplete="off"
          className={inputClassName}
        />

        <Button
          type="submit"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full text-white"
          style={{ background: '#2E86C1' }}
        >
          <Search className="h-4 w-4" />
        </Button>

        {suggestionsOpen && normalizedSearchQuery && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[80] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            {searchSuggestions.length > 0 ? (
              <>
                <div className="max-h-80 overflow-y-auto py-2">
                  {searchSuggestions.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionSelect(product)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-400">
                            FMM
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-800">{product.name}</p>
                        <p className="truncate text-xs text-gray-500">{formatCategoryLabel(product.category)}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => submitSearch(searchQuery)}
                  className="flex w-full items-center justify-between border-t border-gray-100 px-3 py-2.5 text-sm font-semibold text-[#0A2E60] hover:bg-blue-50"
                >
                  <span>Search for “{searchQuery.trim()}”</span>
                  <Search className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="px-3 py-3">
                <p className="text-sm font-medium text-gray-700">No related products yet.</p>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => submitSearch(searchQuery)}
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#0A2E60] px-3 py-2 text-xs font-semibold text-white"
                >
                  Search anyway <Search className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
