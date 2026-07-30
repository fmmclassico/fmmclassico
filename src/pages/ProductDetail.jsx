import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import 'react-quill/dist/quill.snow.css';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import guestCart from '@/lib/guest-cart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Star, Plus, Minus, ExternalLink, PlayCircle } from 'lucide-react';
import ReviewSection from '@/components/products/ReviewSection';
import { motion, AnimatePresence } from 'framer-motion';
import InlineNotice from '@/components/ui/InlineNotice';
import { normalizeMediaUrl } from '@/lib/media';

const categoryNames = {
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

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

function normalizeUrl(value) {
  const normalized = normalizeMediaUrl(value);
  return normalized || null;
}

function parseArrayValue(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeUrl(item)).filter(Boolean))];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parseArrayValue(parsed);
      }
    } catch (_) {
      // fall through
    }

    return [...new Set(
      trimmed
        .split(String.fromCharCode(13)).join('')
        .split(String.fromCharCode(10)).join(',')
        .split(',')
        .map((item) => normalizeUrl(item))
        .filter(Boolean)
    )];
  }

  return [];
}

function getVideoPresentation(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;

  const youtubeMatch = normalized.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return { kind: 'embed', url: normalized, embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&rel=0` };
  }

  const vimeoMatch = normalized.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { kind: 'embed', url: normalized, embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  if (normalized.includes('facebook.com') || normalized.includes('fb.watch')) {
    return { kind: 'embed', url: normalized, embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized)}&show_text=false` };
  }

  if (DIRECT_VIDEO_PATTERN.test(normalized) || normalized.includes('/video/upload/') || normalized.includes('/video/fetch/')) {
    return { kind: 'file', url: normalized };
  }

  return { kind: 'external', url: normalized };
}

function buildGalleryItems(product) {
  const images = [...new Set([
    normalizeUrl(product?.image_url),
    ...parseArrayValue(product?.image_urls),
  ].filter(Boolean))].map((url) => ({ type: 'image', url }));

  const video = getVideoPresentation(product?.video_url);
  if (!video) return images;

  return [
    ...images,
    { type: 'video', ...video },
  ];
}

function getMissingSelections(product, selections) {
  const missing = [];

  if (product?.show_colors && Array.isArray(product?.available_colors) && product.available_colors.length > 0 && !selections.selectedColor) {
    missing.push('Color');
  }
  if (product?.show_wattage && Array.isArray(product?.available_wattage) && product.available_wattage.length > 0 && !selections.selectedWattage) {
    missing.push('Wattage');
  }
  if (product?.show_type && Array.isArray(product?.available_types) && product.available_types.length > 0 && !selections.selectedType) {
    missing.push('Type');
  }

  return missing;
}

function buildVariantPayload({ selectedColor, selectedWattage, selectedType }) {
  const parts = [];
  if (selectedColor) parts.push(`Color: ${selectedColor}`);
  if (selectedWattage) parts.push(`Wattage: ${selectedWattage}`);
  if (selectedType) parts.push(`Type: ${selectedType}`);

  const signature = [selectedColor || '', selectedWattage || '', selectedType || ''].join('|');

  return {
    selected_color: selectedColor || null,
    selected_wattage: selectedWattage || null,
    selected_type: selectedType || null,
    variant_summary: parts.join(' • '),
    options_signature: signature,
  };
}

export default function ProductDetail() {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedWattage, setSelectedWattage] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const videoRef = useRef(null);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => appClient.entities.Product.list(),
  });

  const product = products.find((item) => item.id === productId);
  const galleryItems = useMemo(() => buildGalleryItems(product), [product]);
  const variantPayload = useMemo(() => buildVariantPayload({ selectedColor, selectedWattage, selectedType }), [selectedColor, selectedWattage, selectedType]);

  useEffect(() => {
    if (selectedImageIndex > galleryItems.length - 1) {
      setSelectedImageIndex(0);
    }
  }, [galleryItems.length, selectedImageIndex]);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const missingSelections = getMissingSelections(product, { selectedColor, selectedWattage, selectedType });
      if (missingSelections.length > 0) {
        throw new Error(`Please choose: ${missingSelections.join(', ')}`);
      }

      if (!user) {
        guestCart.addItem({
          id: `${product.id}-${variantPayload.options_signature || 'default'}`,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          product_price: product.price,
          quantity,
          ...variantPayload,
        });
        return;
      }

      queryClient.setQueryData(['cartItems', user.email], (old = []) => {
        const existing = old.find((item) => item.product_id === product.id && (item.options_signature || '') === (variantPayload.options_signature || ''));
        if (existing) {
          return old.map((item) => (
            item.product_id === product.id && (item.options_signature || '') === (variantPayload.options_signature || '')
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ));
        }

        return [
          ...old,
          {
            id: `opt-${product.id}-${variantPayload.options_signature || 'default'}`,
            product_id: product.id,
            product_name: product.name,
            product_image: product.image_url,
            product_price: product.price,
            quantity,
            user_email: user.email,
            ...variantPayload,
          },
        ];
      });

      if (product.stock != null) {
        queryClient.setQueryData(['products'], (old = []) => (
          old.map((item) => item.id === product.id ? { ...item, stock: Math.max(0, item.stock - quantity) } : item)
        ));
      }

      const existingItems = await appClient.entities.CartItem.filter({
        user_email: user.email,
        product_id: product.id,
        options_signature: variantPayload.options_signature,
      });

      if (existingItems.length > 0) {
        await appClient.entities.CartItem.update(existingItems[0].id, {
          quantity: existingItems[0].quantity + quantity,
          ...variantPayload,
        });
      } else {
        await appClient.entities.CartItem.create({
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          product_price: product.price,
          quantity,
          user_email: user.email,
          ...variantPayload,
        });
      }

      if (product.stock != null) {
        await appClient.entities.Product.update(product.id, { stock: Math.max(0, product.stock - quantity) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setFeedback({
        variant: 'success',
        title: 'Cart updated',
        message: 'This item was added to your cart successfully.',
      });
    },
    onError: (error) => {
      setFeedback({
        variant: 'error',
        title: 'Unable to add item',
        message: error?.message || 'Could not add this item to your cart right now.',
      });
    },
  });

  const discount = product?.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const nextImage = useCallback(() => {
    if (galleryItems.length === 0) return;
    setSelectedImageIndex((prev) => (prev + 1) % galleryItems.length);
  }, [galleryItems.length]);

  const prevImage = useCallback(() => {
    if (galleryItems.length === 0) return;
    setSelectedImageIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
  }, [galleryItems.length]);

  const handleTouchStart = (event) => {
    setTouchStart(event.touches[0].clientX);
  };

  const handleTouchEnd = (event) => {
    if (touchStart === null) return;
    const diff = touchStart - event.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextImage(); else prevImage();
    }
    setTouchStart(null);
  };

  const selectedGalleryItem = galleryItems[selectedImageIndex];

  useEffect(() => {
    if (galleryItems.length <= 1) return undefined;
    if (selectedGalleryItem?.type === 'video') return undefined;

    const interval = setInterval(() => {
      nextImage();
    }, 4000);

    return () => clearInterval(interval);
  }, [galleryItems.length, nextImage, selectedGalleryItem?.type]);

  useEffect(() => {
    if (selectedGalleryItem?.type !== 'video' || selectedGalleryItem?.kind !== 'file' || !videoRef.current) {
      return undefined;
    }

    const videoElement = videoRef.current;
    const handleEnded = () => nextImage();

    videoElement.currentTime = 0;
    const playPromise = videoElement.play?.();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }

    videoElement.addEventListener('ended', handleEnded);
    return () => {
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, [nextImage, selectedGalleryItem?.kind, selectedGalleryItem?.type, selectedImageIndex]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-8">
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
        <h2 className="text-xl font-bold text-gray-800 mb-4">Product not found</h2>
        <Link to={createPageUrl('Shop')}>
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div
            className="relative w-full max-w-[280px] sm:max-w-md mx-auto aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-lg cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {galleryItems.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3 px-6 text-center">
                <PlayCircle className="h-10 w-10" />
                <p className="text-sm font-medium">No product media has been added yet.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {selectedGalleryItem?.type === 'video' ? (
                  selectedGalleryItem.kind === 'embed' ? (
                    <motion.iframe
                      key={`embed-${selectedImageIndex}`}
                      src={selectedGalleryItem.embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ border: 'none' }}
                    />
                  ) : selectedGalleryItem.kind === 'file' ? (
                    <motion.video
                      key={`video-${selectedImageIndex}`}
                      ref={videoRef}
                      src={selectedGalleryItem.url}
                      className="w-full h-full object-contain bg-slate-950"
                      controls
                      playsInline
                      autoPlay
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  ) : (
                    <motion.div
                      key={`external-${selectedImageIndex}`}
                      className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6 bg-slate-900 text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <PlayCircle className="h-12 w-12 text-sky-300" />
                      <div>
                        <p className="font-semibold">This video opens on its original platform.</p>
                        <p className="text-sm text-slate-300 mt-1">Tap below to view it in a new tab.</p>
                      </div>
                      <a href={selectedGalleryItem.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white text-slate-900 px-4 py-2 text-sm font-semibold">
                        Open Video <ExternalLink className="h-4 w-4" />
                      </a>
                    </motion.div>
                  )
                ) : (
                  <motion.div
                    key={selectedImageIndex}
                    className="relative w-full h-full overflow-hidden bg-white"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                  >
                    <img
                      src={selectedGalleryItem?.url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-20"
                    />
                    <motion.img
                      src={selectedGalleryItem?.url}
                      alt={product.name}
                      className="relative z-10 h-full w-full object-contain bg-white/92 p-1.5 sm:p-2.5 md:p-3 drop-shadow-[0_18px_36px_rgba(15,23,42,0.18)]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-[#2E86C1] hover:bg-[#2E86C1] text-white text-lg px-3 py-1">
                -{discount}%
              </Badge>
            )}

            {galleryItems.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {galleryItems.map((_, index) => (
                  <button key={index} onClick={() => setSelectedImageIndex(index)} className={`rounded-full transition-all ${index === selectedImageIndex ? 'bg-[#2E86C1] w-4 h-2' : 'bg-white/70 w-2 h-2'}`} />
                ))}
              </div>
            )}
          </div>

          {galleryItems.length > 0 && (
            <div className="grid grid-cols-5 gap-2 max-w-[280px] sm:max-w-md mx-auto">
              {galleryItems.map((item, index) => (
                <button
                  key={`${item.type}-${index}`}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative ${selectedImageIndex === index ? 'border-[#2E86C1] shadow-md' : 'border-transparent hover:border-gray-300'}`}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white">
                      <PlayCircle className="h-6 w-6" />
                    </div>
                  ) : (
                    <img src={item.url} alt={`${product.name} view ${index + 1}`} className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div>
            <Badge variant="outline" className="mb-1.5 text-xs">{categoryNames[product.category] || product.category}</Badge>
            <h1 className="text-base md:text-lg font-bold text-gray-800 mb-1.5 leading-snug">{product.name}</h1>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((index) => (
                  <Star key={index} className={`h-3.5 w-3.5 ${index <= (product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-gray-500 text-xs">({product.reviews_count || 0} reviews)</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#2E86C1]">₵{product.price?.toFixed(2)}</span>
            {product.original_price && <span className="text-base text-gray-400 line-through">₵{product.original_price?.toFixed(2)}</span>}
          </div>

          {product.description && (
            <details className="group border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer font-semibold text-gray-700 select-none list-none">
                <span>Product Details</span>
                <span className="text-[#2E86C1] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 py-3 text-gray-600 leading-relaxed text-sm product-description ql-editor" dangerouslySetInnerHTML={{ __html: product.description }} />
            </details>
          )}

          {product.show_colors && product.available_colors?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1.5">Color: {selectedColor && <span className="text-[#2E86C1]">{selectedColor}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {product.available_colors.map((color) => (
                  <button key={color} onClick={() => setSelectedColor(color === selectedColor ? null : color)} className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${selectedColor === color ? 'border-[#2E86C1] bg-[#2E86C1]/10 text-[#2E86C1]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'}`}>
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.show_wattage && product.available_wattage?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1.5">Wattage: {selectedWattage && <span className="text-[#2E86C1]">{selectedWattage}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {product.available_wattage.map((wattage) => (
                  <button key={wattage} onClick={() => setSelectedWattage(wattage === selectedWattage ? null : wattage)} className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${selectedWattage === wattage ? 'border-[#2E86C1] bg-[#2E86C1]/10 text-[#2E86C1]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'}`}>
                    {wattage}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.show_type && product.available_types?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1.5">Type: {selectedType && <span className="text-[#2E86C1]">{selectedType}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {product.available_types.map((type) => (
                  <button key={type} onClick={() => setSelectedType(type === selectedType ? null : type)} className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${selectedType === type ? 'border-[#2E86C1] bg-[#2E86C1]/10 text-[#2E86C1]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variantPayload.variant_summary && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs font-semibold text-blue-800">Selected options</p>
              <p className="text-sm text-blue-700 mt-1">{variantPayload.variant_summary}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-gray-600 font-medium text-sm">Quantity:</span>
            <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setQuantity(quantity + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {product.stock != null && <span className={`text-xs font-semibold ${product.stock <= 5 ? 'text-red-500' : 'text-gray-500'}`}>{product.stock} in stock</span>}
          </div>

          <InlineNotice
            variant={feedback?.variant}
            title={feedback?.title}
            message={feedback?.message}
            onDismiss={() => setFeedback(null)}
          />

          <div className="flex gap-3">
            <Button size="lg" className="flex-1 bg-[#2E86C1] hover:bg-[#2578ae] text-white font-bold shadow-lg" onClick={() => addToCartMutation.mutate()} disabled={addToCartMutation.isPending}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>
        </motion.div>
      </div>

      <ReviewSection product={product} user={user} />
    </div>
  );
}
