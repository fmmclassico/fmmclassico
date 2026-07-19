import React, { useEffect, useState } from 'react';
import 'react-quill/dist/quill.snow.css';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import guestCart from '@/lib/guest-cart';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Star, Plus, Minus, ChevronDown } from 'lucide-react';
import ReviewSection from '@/components/products/ReviewSection';
import { motion, AnimatePresence } from 'framer-motion';

const CEDI_SYMBOL = '\u20B5';

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return `${CEDI_SYMBOL}${value.toFixed(2)}`;
};

export default function ProductDetail() {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedWattage, setSelectedWattage] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const product = products.find((p) => p.id === productId);

  const allImages = product
    ? [product.image_url, ...(product.image_urls || [])].filter(Boolean)
    : [];

  const videoUrl = product?.video_url || null;

  const getSocialEmbedUrl = (url) => {
    if (!url) return null;

    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
    if (url.includes('tiktok.com')) return url;
    if (url.includes('pinterest.com/pin/')) return null;

    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    if (url.includes('facebook.com') || url.includes('fb.watch')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }

    return null;
  };

  const galleryItems = [
    ...allImages.map((url) => ({ type: 'image', url })),
    ...(videoUrl ? [{ type: 'video', url: videoUrl, embedUrl: getSocialEmbedUrl(videoUrl) }] : []),
  ];

  const isVideo = (item) => typeof item === 'object' && item?.type === 'video';
  const getUrl = (item) => (typeof item === 'string' ? item : item?.url);

  const hasTrackedStock = product?.stock != null;
  const stockCount = Number(product?.stock ?? 0);
  const isOutOfStock = hasTrackedStock && stockCount <= 0;
  const isLowStock = hasTrackedStock && stockCount > 0 && stockCount <= 5;
  const maxQuantity = hasTrackedStock && stockCount > 0 ? stockCount : null;
  const hasReviews = Number(product?.reviews_count || 0) > 0;
  const discount = product?.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const stockLabel = !hasTrackedStock
    ? null
    : isOutOfStock
      ? 'Out of stock'
      : isLowStock
        ? `Only ${stockCount} unit${stockCount === 1 ? '' : 's'} left`
        : `${stockCount} unit${stockCount === 1 ? '' : 's'} available`;

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (isOutOfStock) return;

      if (!user) {
        guestCart.addItem({
          id: product.id,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          product_price: product.price,
          quantity,
        });
        return;
      }

      queryClient.setQueryData(['cartItems', user.email], (old = []) => {
        const existing = old.find((item) => item.product_id === product.id);
        if (existing) {
          return old.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }

        return [
          ...old,
          {
            id: `opt-${product.id}`,
            product_id: product.id,
            product_name: product.name,
            product_image: product.image_url,
            product_price: product.price,
            quantity,
            user_email: user.email,
          },
        ];
      });

      if (hasTrackedStock) {
        queryClient.setQueryData(['products'], (old = []) =>
          old.map((item) =>
            item.id === product.id
              ? { ...item, stock: Math.max(0, item.stock - quantity) }
              : item
          )
        );
      }

      const existingItems = await base44.entities.CartItem.filter({
        user_email: user.email,
        product_id: product.id,
      });

      if (existingItems.length > 0) {
        await base44.entities.CartItem.update(existingItems[0].id, {
          quantity: existingItems[0].quantity + quantity,
        });
      } else {
        await base44.entities.CartItem.create({
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          product_price: product.price,
          quantity,
          user_email: user.email,
        });
      }

      if (hasTrackedStock) {
        await base44.entities.Product.update(product.id, {
          stock: Math.max(0, stockCount - quantity),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const nextImage = () => {
    if (galleryItems.length <= 1) return;
    setSelectedImageIndex((prev) => (prev + 1) % galleryItems.length);
  };

  const prevImage = () => {
    if (galleryItems.length <= 1) return;
    setSelectedImageIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextImage();
      else prevImage();
    }
    setTouchStart(null);
  };

  useEffect(() => {
    if (galleryItems.length <= 1) return undefined;
    const interval = setInterval(() => {
      setSelectedImageIndex((prev) => (prev + 1) % galleryItems.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [galleryItems.length]);

  useEffect(() => {
    if (!product?.name) return;
    document.title = `${product.name} | FMM CLASSICO`;
  }, [product?.name]);

  useEffect(() => {
    if (maxQuantity && quantity > maxQuantity) {
      setQuantity(maxQuantity);
    }
  }, [maxQuantity, quantity]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="mb-4 text-xl font-bold text-gray-800">Product not found</h2>
        <Link to={createPageUrl('Shop')}>
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const selectedGalleryItem = galleryItems[selectedImageIndex];

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="grid gap-8 md:grid-cols-2 lg:gap-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div
            className="relative mx-auto aspect-square w-full max-w-[280px] cursor-grab overflow-hidden rounded-2xl bg-gray-100 shadow-lg active:cursor-grabbing sm:max-w-md"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              {selectedGalleryItem ? (
                isVideo(selectedGalleryItem) ? (
                  selectedGalleryItem.embedUrl ? (
                    <motion.iframe
                      key={`embed-${selectedImageIndex}`}
                      src={selectedGalleryItem.embedUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ border: 'none' }}
                    />
                  ) : (
                    <motion.video
                      key={`video-${selectedImageIndex}`}
                      src={getUrl(selectedGalleryItem)}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )
                ) : (
                  <motion.img
                    key={selectedImageIndex}
                    src={getUrl(selectedGalleryItem)}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                  No product media
                </div>
              )}
            </AnimatePresence>

            {discount > 0 && (
              <Badge className="absolute left-4 top-4 bg-[#2E86C1] px-3 py-1 text-sm text-white hover:bg-[#2E86C1]">
                -{discount}%
              </Badge>
            )}

            {galleryItems.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {galleryItems.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`rounded-full transition-all ${
                      idx === selectedImageIndex ? 'h-2 w-4 bg-[#2E86C1]' : 'h-2 w-2 bg-white/70'
                    }`}
                    aria-label={`View media ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {galleryItems.length > 0 && (
            <div className="mx-auto grid max-w-[280px] grid-cols-5 gap-2 sm:max-w-md">
              {galleryItems.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                    selectedImageIndex === idx
                      ? 'border-[#2E86C1] shadow-md'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {isVideo(item) ? (
                    <div className="flex h-full w-full items-center justify-center bg-gray-800">
                      <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  ) : (
                    <img
                      src={getUrl(item)}
                      alt={`${product.name} view ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-5"
        >
          <div className="space-y-3">
            <h1 className="text-xl font-bold leading-snug text-gray-900 md:text-2xl">{product.name}</h1>

            <div className="flex flex-wrap items-end gap-2">
              <span className="text-2xl font-bold text-[#2E86C1] md:text-3xl">{formatCurrency(product.price)}</span>
              {product.original_price && (
                <span className="text-base text-gray-400 line-through md:text-lg">{formatCurrency(product.original_price)}</span>
              )}
            </div>

            {(stockLabel || discount > 0) && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
                {stockLabel && (
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      isOutOfStock
                        ? 'bg-red-100 text-red-600'
                        : isLowStock
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {stockLabel}
                  </span>
                )}
                {discount > 0 && (
                  <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-[#2E86C1]">
                    Save {discount}% today
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i <= Math.round(product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              {hasReviews && (
                <span className="text-sm text-gray-500">
                  {`${product.reviews_count} review${Number(product.reviews_count) === 1 ? '' : 's'}`}
                </span>
              )}
            </div>
          </div>

          {product.description && (
            <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between bg-gray-50 px-5 py-3 font-semibold text-gray-700 select-none md:px-6">
                <span>Product Details</span>
                <ChevronDown className="h-4 w-4 text-[#2E86C1] transition-transform group-open:rotate-180" />
              </summary>
              <div
                className="fmm-product-details-content ql-editor px-5 py-4 text-sm leading-7 text-gray-600 md:px-6"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </details>
          )}

          {product.show_colors && product.available_colors?.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-gray-700">
                Color: {selectedColor && <span className="text-[#2E86C1]">{selectedColor}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.available_colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color === selectedColor ? null : color)}
                    className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedColor === color
                        ? 'border-[#2E86C1] bg-[#2E86C1]/10 text-[#2E86C1]'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.show_wattage && product.available_wattage?.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-gray-700">
                Wattage: {selectedWattage && <span className="text-[#2E86C1]">{selectedWattage}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.available_wattage.map((wattage) => (
                  <button
                    key={wattage}
                    type="button"
                    onClick={() => setSelectedWattage(wattage === selectedWattage ? null : wattage)}
                    className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedWattage === wattage
                        ? 'border-[#2E86C1] bg-[#2E86C1]/10 text-[#2E86C1]'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {wattage}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.show_type && product.available_types?.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-gray-700">
                Type: {selectedType && <span className="text-[#2E86C1]">{selectedType}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.available_types.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type === selectedType ? null : type)}
                    className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedType === type
                        ? 'border-[#2E86C1] bg-[#2E86C1]/10 text-[#2E86C1]'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Quantity:</span>
              <div className="flex items-center gap-2 rounded-full bg-gray-100 p-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setQuantity((prev) => (maxQuantity ? Math.min(maxQuantity, prev + 1) : prev + 1))}
                  disabled={Boolean(maxQuantity && quantity >= maxQuantity)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-[#2E86C1] font-bold text-white shadow-lg hover:bg-[#2578ae]"
              onClick={() => addToCartMutation.mutate()}
              disabled={addToCartMutation.isPending || isOutOfStock}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {isOutOfStock
                ? 'Out of Stock'
                : addToCartMutation.isPending
                  ? 'Adding...'
                  : 'Add to Cart'}
            </Button>
          </div>
        </motion.div>
      </div>

      <ReviewSection product={product} user={user} />
    </div>
  );
}
