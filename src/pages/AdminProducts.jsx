import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, Pencil, Plus, Eye, EyeOff, ImagePlus, Loader2, Check, Video } from 'lucide-react';
import { toast } from 'sonner';

// ── STRICT CATEGORY STRUCTURE ─────────────────────────────────────────────────
const MAIN_CATEGORY_GROUPS = [
  { label: 'Phones', id: 'phones' },
  { label: 'Phone Accessories', id: 'phone_accessories' },
  { label: 'Electronics', id: 'electronics' },
  { label: 'Home Appliances', id: 'home_appliances_group' },
];

const GROUP_CATEGORIES = {
  phones: [{ value: 'phones', label: 'Phones' }],
  phone_accessories: [
    { value: 'phone_cases', label: 'Phone Cases' },
    { value: 'chargers', label: 'Chargers' },
    { value: 'earphones', label: 'Earphones' },
    { value: 'cables', label: 'Cables' },
    { value: 'power_banks', label: 'Power Banks' },
    { value: 'screen_protectors', label: 'Screen Protectors' },
    { value: 'holders', label: 'Holders & Mounts' },
    { value: 'speakers', label: 'Speakers' },
    { value: 'smart_watches', label: 'Smart Watches' },
  ],
  electronics: [{ value: 'electronic_appliances', label: 'Electronic Appliances' }],
  home_appliances_group: [{ value: 'home_appliances', label: 'Home Appliances' }],
};

const GROUP_BRANDS = {
  phones: ['Apple', 'Samsung', 'Tecno', 'Infinix', 'Itel', 'Other'],
  phone_accessories: ['Apple', 'Samsung', 'Oraimo', 'JBL', 'Sony', 'LG', 'Other'],
  electronics: ['Samsung', 'Sony', 'LG', 'TCL', 'Hisense', 'Midea', 'Other'],
  home_appliances_group: ['Samsung', 'LG', 'Hisense', 'TCL', 'Midea', 'Roch', 'Silver Crest', 'Nasco', 'Hoffman', 'Other'],
};

const BRAND_SUBCATEGORIES = {
  phones: {
    Apple: ['iPhone SE', 'iPhone 11', 'iPhone 12 Series', 'iPhone 13 Series', 'iPhone 14 Series', 'iPhone 15 Series'],
    Samsung: ['Galaxy A Series', 'Galaxy S Series', 'Galaxy Z Fold/Flip'],
    Tecno: ['Spark Series', 'Camon Series', 'Phantom Series', 'Pop Series'],
    Infinix: ['Hot Series', 'Note Series', 'Smart Series', 'Zero Series'],
    Itel: ['A Series', 'S Series', 'P Series (Big Battery)'],
  },
  phone_cases: { Apple: ['iPhone Cases'], Samsung: ['Galaxy Cases'], Oraimo: ['Universal Cases'] },
  chargers: {
    Apple: ['Apple 20W Charger', 'MagSafe Charger', 'Apple Car Charger'],
    Samsung: ['Samsung Fast Charger', 'Samsung Wireless Charger'],
    Oraimo: ['Fast Charger 20W', 'Car Charger', 'Wireless Charger', 'Multi-port Charger'],
  },
  earphones: {
    Apple: ['AirPods', 'AirPods Pro', 'AirPods Max'],
    Samsung: ['Galaxy Buds', 'Galaxy Buds Pro'],
    Oraimo: ['FreePods (Wireless Earbuds)', 'Neckband Earphones', 'Wired Earphones', 'Bluetooth Headphones'],
    JBL: ['JBL Tune Earbuds', 'JBL Free X', 'JBL Live Series', 'JBL Wired Earphones'],
    Sony: ['Sony WF Series (Earbuds)', 'Sony WH Series (Headphones)', 'Sony Wired Earphones'],
  },
  cables: {
    Apple: ['Lightning Cable', 'USB-C to Lightning'],
    Samsung: ['USB-C Cable', 'Samsung Data Cable'],
    Oraimo: ['USB-C Cable', 'Lightning Cable', 'Micro USB Cable', 'Braided Cable'],
  },
  power_banks: {
    Oraimo: ['Power Bank 10,000mAh', 'Power Bank 20,000mAh', 'Solar Power Bank'],
    Samsung: ['Samsung Power Bank'],
  },
  screen_protectors: { Apple: ['iPhone Screen Protector'], Samsung: ['Galaxy Screen Protector'] },
  holders: { Oraimo: ['Car Phone Holder', 'Desk Stand'], Samsung: ['Samsung Phone Stand'] },
  speakers: {
    JBL: ['JBL Go', 'JBL Flip', 'JBL Charge', 'JBL Xtreme', 'JBL PartyBox'],
    Sony: ['Sony Portable Speaker', 'Sony Party Speaker'],
    Oraimo: ['Bluetooth Speaker', 'Mini Speaker'],
  },
  smart_watches: {
    Apple: ['Apple Watch SE', 'Apple Watch Series 8', 'Apple Watch Ultra'],
    Samsung: ['Galaxy Watch'],
    Oraimo: ['Oraimo Watch', 'Oraimo Watch Pro'],
  },
  electronic_appliances: {
    Samsung: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Soundbar', 'Home Theatre'],
    Sony: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Soundbar', 'Home Theatre'],
    LG: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'OLED TV', 'Soundbar'],
    TCL: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Smart TV 65"', 'Android TV', '4K UHD TV'],
    Hisense: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Smart TV 65"', 'QLED TV'],
    Midea: ['Air Conditioner Split Unit', 'Air Purifier'],
  },
  home_appliances: {
    Samsung: ['Refrigerator', 'Washing Machine', 'Microwave', 'Air Conditioner'],
    LG: ['Refrigerator', 'Washing Machine', 'Air Conditioner', 'Microwave'],
    Hisense: ['Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Chest Freezer', 'Washing Machine', 'Air Conditioner', 'Microwave'],
    TCL: ['Refrigerator', 'Washing Machine', 'Air Conditioner'],
    Midea: ['Refrigerator', 'Washing Machine', 'Air Conditioner', 'Microwave', 'Rice Cooker', 'Blender'],
    Roch: ['Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Chest Freezer', 'Washing Machine', 'Blender', 'Rice Cooker', 'Electric Kettle', 'Microwave', 'Standing Fan', 'Air Conditioner'],
    'Silver Crest': ['Blender', 'Rice Cooker', 'Electric Kettle', 'Microwave', 'Toaster', 'Sandwich Maker', 'Food Processor', 'Juicer', 'Standing Fan'],
    Nasco: ['Refrigerator', 'Chest Freezer', 'Washing Machine', 'Blender', 'Rice Cooker', 'Electric Kettle', 'Standing Fan', 'Air Conditioner'],
    Hoffman: ['Refrigerator', 'Chest Freezer', 'Washing Machine', 'Air Conditioner', 'Standing Fan', 'Blender', 'Rice Cooker', 'Electric Kettle'],
  },
};

const PRODUCT_TAGS = [
  { key: 'classico_deals', label: '⚡ CLASSICO Deals' },
  { key: 'donkomi_deals', label: '🔥 Donkomi Deals' },
  { key: 'new_arrivals', label: '✨ New Arrivals' },
  { key: 'top_selling', label: '🏆 Top Selling' },
  { key: 'featured', label: '⭐ Featured' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  original_price: '',
  main_group: '',
  category: '',
  brand: '',
  brand_custom: '',
  subcategory: '',
  subcategory_custom: '',
  stock: '',
  video_url: '',
  image_url: '',
  image_urls: [],
  review_enabled: true,
  rating: '',
  reviews_count: '',
  tags: {
    classico_deals: false,
    donkomi_deals: false,
    new_arrivals: false,
    top_selling: false,
    featured: false,
  },
  visible: true,
};

// ── VIDEO HELPERS ─────────────────────────────────────────────────────────────
const getVideoEmbedUrl = (url) => {
  if (!url) return null;
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;

  const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  const instagramRegex = /(?:instagram\.com\/(?:p|reel)\/|instagr\.am\/)([a-zA-Z0-9_-]+)/;
  const instagramMatch = url.match(instagramRegex);
  if (instagramMatch) return `https://www.instagram.com/p/${instagramMatch[1]}/embed`;

  if (url.includes('embed') || url.includes('player') || url.match(/\.(mp4|webm|ogg)(\?|$)/i)) return url;
  return null;
};

const isDirectVideoFile = (url) => url && url.match(/\.(mp4|webm|ogg)(\?|$)/i);
const isTikTok = (url) => url && url.includes('tiktok.com');
const isPinterest = (url) => url && url.includes('pinterest.com');

const VideoPreview = ({ url }) => {
  if (!url) return null;
  if (isTikTok(url) || isPinterest(url)) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-xs text-gray-600 mb-1">{isTikTok(url) ? 'TikTok' : 'Pinterest'} video (opens externally)</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline break-all">{url}</a>
      </div>
    );
  }
  if (isDirectVideoFile(url)) {
    return (
      <video src={url} controls className="w-full rounded-lg border border-gray-200 max-h-64" />
    );
  }
  const embedUrl = getVideoEmbedUrl(url);
  if (!embedUrl) return <p className="text-xs text-red-500">Unable to embed this video URL</p>;
  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      <iframe width="100%" height="240" src={embedUrl} frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen className="rounded-lg" />
    </div>
  );
};

// ── PRODUCT VIDEO DISPLAY (for product page) ──────────────────────────────────
export const ProductVideoDisplay = ({ product }) => {
  const url = product?.video_url;
  if (!url) return null;
  if (isTikTok(url) || isPinterest(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-blue-600 text-sm hover:underline mt-2">
        <Video className="h-4 w-4" /> Watch video
      </a>
    );
  }
  if (isDirectVideoFile(url)) {
    return <video src={url} controls className="w-full rounded-xl mt-2 max-h-72" />;
  }
  const embedUrl = getVideoEmbedUrl(url);
  if (!embedUrl) return null;
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
      <iframe width="100%" height="260" src={embedUrl} frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen />
    </div>
  );
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  // Local visibility overrides for optimistic UI: { [id]: boolean }
  const [visibilityMap, setVisibilityMap] = useState({});
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-admin'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
    enabled: isAdmin,
  });

  // Helper: get current visible state (optimistic takes priority)
  const getVisible = (product) =>
    visibilityMap[product.id] !== undefined ? visibilityMap[product.id] : product.visible !== false;

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { main_group, brand_custom, subcategory_custom, ...rest } = data;
      const finalBrand = data.brand === 'Other' && data.brand_custom ? data.brand_custom : data.brand;
      const finalSubcategory = data.subcategory_custom || data.subcategory;
      const payload = {
        ...rest,
        brand: finalBrand,
        subcategory: finalSubcategory,
        price: parseFloat(data.price) || 0,
        original_price: data.original_price ? parseFloat(data.original_price) : undefined,
        stock: data.stock !== '' ? parseInt(data.stock) : undefined,
        rating: data.rating ? parseFloat(data.rating) : undefined,
        reviews_count: data.reviews_count ? parseInt(data.reviews_count) : undefined,
        tags: data.tags,
        visible: data.visible,
      };
      if (editingProduct) return base44.entities.Product.update(editingProduct.id, payload);
      return base44.entities.Product.create(payload);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['products'] });
      queryClient.removeQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      toast.success(editingProduct ? 'Product updated!' : 'Product created!');
      setShowForm(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error('Failed to save product'),
  });

  // ── VISIBILITY TOGGLE (with optimistic update) ────────────────────────────
  const visibilityMutation = useMutation({
    mutationFn: ({ id, visible }) => base44.entities.Product.update(id, { visible }),
    onMutate: ({ id, visible }) => {
      // Immediately reflect change in UI
      setVisibilityMap(prev => ({ ...prev, [id]: visible }));
    },
    onSuccess: (_, { visible }) => {
      // Invalidate so fresh data replaces the optimistic state
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      toast.success(visible ? 'Product is now visible' : 'Product is now hidden');
    },
    onError: (_, { id, visible }) => {
      // Revert optimistic update on failure
      setVisibilityMap(prev => ({ ...prev, [id]: !visible }));
      toast.error('Failed to update visibility');
    },
  });

  const handleToggleVisibility = (product) => {
    const currentVisible = getVisible(product);
    const newVisible = !currentVisible;
    visibilityMutation.mutate({ id: product.id, visible: newVisible });
  };

  // ── IMAGE UPLOADS ─────────────────────────────────────────────────────────
  const handleUploadMain = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, image_url: file_url }));
      toast.success('Main image uploaded!');
    } catch { toast.error('Failed to upload image'); }
    setUploadingMain(false);
  };

  const handleUploadExtra = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingExtra(true);
    try {
      const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
      setForm(f => ({ ...f, image_urls: [...(f.image_urls || []), ...urls].slice(0, 4) }));
      toast.success(`${urls.length} image(s) uploaded!`);
    } catch { toast.error('Failed to upload images'); }
    setUploadingExtra(false);
  };

  // ── VIDEO UPLOAD ──────────────────────────────────────────────────────────
  const handleUploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, video_url: file_url }));
      toast.success('Video uploaded!');
    } catch { toast.error('Failed to upload video'); }
    setUploadingVideo(false);
  };

  // ── EDIT ──────────────────────────────────────────────────────────────────
  const handleEdit = (product) => {
    setEditingProduct(product);
    const cat = product.category || '';
    let main_group = '';
    if (cat === 'phones') main_group = 'phones';
    else if (cat === 'electronic_appliances') main_group = 'electronics';
    else if (cat === 'home_appliances') main_group = 'home_appliances_group';
    else if (cat) main_group = 'phone_accessories';

    const brandOptions = GROUP_BRANDS[main_group] || [];
    const isBrandCustom = product.brand && !brandOptions.includes(product.brand);

    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      original_price: product.original_price ?? '',
      main_group,
      category: product.category || '',
      brand: isBrandCustom ? 'Other' : (product.brand || ''),
      brand_custom: isBrandCustom ? product.brand : '',
      subcategory: product.subcategory || '',
      subcategory_custom: '',
      stock: product.stock ?? '',
      video_url: product.video_url || '',
      image_url: product.image_url || '',
      image_urls: product.image_urls || [],
      review_enabled: product.review_enabled !== false,
      rating: product.rating ?? '',
      reviews_count: product.reviews_count ?? '',
      tags: product.tags || { classico_deals: false, donkomi_deals: false, new_arrivals: false, top_selling: false, featured: false },
      visible: product.visible !== false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNew = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTagSelection = (tagKey) => {
    setForm(f => ({ ...f, tags: { ...f.tags, [tagKey]: !f.tags[tagKey] } }));
  };

  // ── TAG FILTER: Only show products that have at least one tag selected ─────
  // We show ALL products in admin (so admin can manage them), but we provide
  // a helper for the customer-facing pages. The product list here shows all.
  // For customer-facing filtered sections, export the helper below.
  const getProductsByTag = (productList, tagKey) =>
    productList.filter(p => p.tags?.[tagKey] === true && getVisible(p));

  if (!isAdmin && user) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;
  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Manage Products</h1>
        <Button onClick={handleNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* ── FORM ── */}
      {showForm && (
        <Card className="p-5 mb-8 border-2 border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-gray-800">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
            <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Main Image */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Main Product Image</Label>
              <div className="flex items-start gap-4">
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                  {form.image_url
                    ? <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    : <ImagePlus className="h-8 w-8 text-gray-300" />}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors w-fit">
                      {uploadingMain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingMain ? 'Uploading...' : form.image_url ? 'Replace Image' : 'Upload Image'}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadMain} disabled={uploadingMain} />
                  </label>
                  {form.image_url && <p className="text-xs text-green-600 font-medium">✓ Image uploaded</p>}
                </div>
              </div>
            </div>

            {/* Extra Images */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Extra Images (up to 4)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(form.image_urls || []).map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, j) => j !== i) }))}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1"
                    ><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {(form.image_urls || []).length < 4 && (
                  <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 transition-colors">
                    {uploadingExtra ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <Plus className="h-5 w-5 text-gray-400" />}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadExtra} disabled={uploadingExtra} />
                  </label>
                )}
              </div>
            </div>

            {/* ── VIDEO SECTION ── */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Product Video (Optional)</Label>
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                {/* Upload button */}
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-300 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors w-fit">
                      {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                      {uploadingVideo ? 'Uploading video...' : 'Upload Video File'}
                    </div>
                    <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
                  </label>
                  <span className="text-xs text-gray-400">or paste a URL below</span>
                </div>

                {/* URL paste */}
                <div>
                  <Input
                    value={form.video_url || ''}
                    onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=... or TikTok, Instagram, Vimeo, direct .mp4"
                    className="bg-white"
                  />
                </div>

                {/* Clear button */}
                {form.video_url && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setForm(f => ({ ...f, video_url: '' }))}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    ><X className="h-3 w-3" /> Remove video</button>
                  </div>
                )}

                {/* Preview */}
                {form.video_url && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Preview:</p>
                    <VideoPreview url={form.video_url} />
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. iPhone 14 Pro Max" />
            </div>

            {/* Step 1 */}
            <div>
              <Label>Step 1 — Main Category *</Label>
              <Select value={form.main_group} onValueChange={v => setForm(f => ({ ...f, main_group: v, category: '', brand: '', brand_custom: '', subcategory: '', subcategory_custom: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger>
                <SelectContent>
                  {MAIN_CATEGORY_GROUPS.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2 */}
            <div>
              <Label>Step 2 — Subcategory *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v, brand: '', brand_custom: '', subcategory: '', subcategory_custom: '' }))} disabled={!form.main_group}>
                <SelectTrigger><SelectValue placeholder={form.main_group ? 'Select subcategory' : 'Select main category first'} /></SelectTrigger>
                <SelectContent>
                  {(GROUP_CATEGORIES[form.main_group] || []).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3 */}
            <div>
              <Label>Step 3 — Brand *</Label>
              <Select value={form.brand} onValueChange={v => setForm(f => ({ ...f, brand: v, brand_custom: '', subcategory: '', subcategory_custom: '' }))} disabled={!form.category}>
                <SelectTrigger><SelectValue placeholder={form.category ? 'Select brand' : 'Select subcategory first'} /></SelectTrigger>
                <SelectContent>
                  {(GROUP_BRANDS[form.main_group] || []).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.brand === 'Other' && (
                <Input className="mt-2" placeholder="Enter custom brand name" value={form.brand_custom} onChange={e => setForm(f => ({ ...f, brand_custom: e.target.value }))} />
              )}
            </div>

            {/* Step 4 */}
            <div>
              <Label>Step 4 — Product Type</Label>
              <Select
                value={form.subcategory}
                onValueChange={v => v === '__custom__' ? setForm(f => ({ ...f, subcategory: '', subcategory_custom: '' })) : setForm(f => ({ ...f, subcategory: v, subcategory_custom: '' }))}
                disabled={!form.brand}
              >
                <SelectTrigger><SelectValue placeholder={form.brand ? 'Select product type' : 'Select brand first'} /></SelectTrigger>
                <SelectContent>
                  {((BRAND_SUBCATEGORIES[form.category] || {})[form.brand] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value="__custom__">+ Add Custom Type</SelectItem>
                </SelectContent>
              </Select>
              {form.subcategory === '' && form.brand && (
                <Input className="mt-2" placeholder="Enter custom product type" value={form.subcategory_custom} onChange={e => setForm(f => ({ ...f, subcategory_custom: e.target.value }))} />
              )}
            </div>

            {/* Price */}
            <div>
              <Label>Price (₵) *</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" step="0.01" />
            </div>

            <div>
              <Label>Original Price (₵) — discount display (Optional)</Label>
              <Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} placeholder="Leave empty if no discount" step="0.01" />
            </div>

            <div>
              <Label>Stock Quantity (Optional)</Label>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Leave empty if no stock tracking" />
            </div>

            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Product description..." />
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-3">Product Tags — select which homepage sections to show this in</Label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_TAGS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.tags[key] ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                      onClick={() => toggleTagSelection(key)}
                    >
                      {form.tags[key] && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">⚠️ Only products with a tag selected will appear in that homepage section. Products with no tags won't show in any section.</p>
            </div>

            {/* Review */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 w-fit">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.review_enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                  onClick={() => setForm(f => ({ ...f, review_enabled: !f.review_enabled }))}
                >
                  {form.review_enabled && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm font-medium text-gray-700">💬 Enable Reviews</span>
              </label>
            </div>

            <div>
              <Label>Rating (Optional)</Label>
              <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} placeholder="e.g. 4.5" />
            </div>

            <div>
              <Label>Number of Reviews (Optional)</Label>
              <Input type="number" value={form.reviews_count} onChange={e => setForm(f => ({ ...f, reviews_count: e.target.value }))} placeholder="e.g. 45" />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name || !form.price || !form.category || !form.brand || (!form.subcategory && !form.subcategory_custom)}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingProduct(null); setForm(EMPTY_FORM); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── PRODUCTS LIST ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {products.map(product => {
            const visible = getVisible(product);
            return (
              <Card key={product.id} className={`overflow-hidden shadow-sm hover:shadow-md transition-all ${!visible ? 'opacity-50' : ''}`}>
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>}

                  {/* Visibility Toggle */}
                  <div className="absolute top-1.5 right-1.5">
                    <button
                      onClick={() => handleToggleVisibility(product)}
                      disabled={visibilityMutation.isPending && visibilityMutation.variables?.id === product.id}
                      title={visible ? 'Click to hide product' : 'Click to show product'}
                      className={`p-2 rounded-lg transition-colors shadow-sm ${
                        visible
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {visibilityMutation.isPending && visibilityMutation.variables?.id === product.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />
                      }
                    </button>
                  </div>

                  {/* Tag badges */}
                  <div className="absolute top-1 left-1 flex flex-col gap-1">
                    {product.tags?.classico_deals && <Badge className="text-[9px] px-1 py-0 bg-blue-500">Deals</Badge>}
                    {product.tags?.donkomi_deals && <Badge className="text-[9px] px-1 py-0 bg-red-500">Donkomi</Badge>}
                    {product.tags?.new_arrivals && <Badge className="text-[9px] px-1 py-0 bg-yellow-500">New</Badge>}
                    {product.tags?.top_selling && <Badge className="text-[9px] px-1 py-0 bg-green-500">Top</Badge>}
                    {product.tags?.featured && <Badge className="text-[9px] px-1 py-0 bg-purple-500">Featured</Badge>}
                  </div>

                  {/* Video indicator */}
                  {product.video_url && (
                    <div className="absolute bottom-1 left-1">
                      <Badge className="text-[9px] px-1 py-0 bg-black/60 text-white flex items-center gap-0.5">
                        <Video className="h-2.5 w-2.5" /> Video
                      </Badge>
                    </div>
                  )}

                  {/* Hidden overlay */}
                  {!visible && (
                    <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-500 bg-white/80 px-2 py-1 rounded">Hidden</span>
                    </div>
                  )}
                </div>

                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</p>
                  <p className="text-sm font-black text-gray-900">₵{product.price?.toLocaleString()}</p>
                  {product.original_price && product.original_price > 0 && (
                    <p className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                  )}
                  {product.stock != null && product.stock > 0 && (
                    <p className="text-[10px] text-gray-400">Stock: {product.stock}</p>
                  )}
                  <div className="flex gap-1 mt-1.5">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => handleEdit(product)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && products.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>No products yet. Click "Add Product" to get started.</p>
        </div>
      )}
    </div>
  );
}

// ── EXPORTED HELPERS FOR CUSTOMER-FACING PAGES ────────────────────────────────
// Use this on your homepage to get only tagged + visible products per section:
//
//   import { getVisibleProductsByTag } from './AdminProducts';
//   const deals = getVisibleProductsByTag(allProducts, 'classico_deals');
//
export const getVisibleProductsByTag = (products, tagKey) =>
  (products || []).filter(p => p.visible !== false && p.tags?.[tagKey] === true);