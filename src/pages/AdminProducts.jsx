import React, { useState } from 'react';
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
import { Upload, X, Pencil, Plus, ImagePlus, Loader2, Check, Video, Eye, EyeOff } from 'lucide-react';
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
  electronics: ['Samsung', 'Sony', 'LG', 'TCL', 'Hisense', 'Midea', 'Oraimo', 'Other'],
  home_appliances_group: ['Samsung', 'Hisense', 'TCL', 'Roch', 'Silver Crest', 'Nasco', 'Hoffman', 'Oraimo', 'Other'],
};

const BRAND_SUBCATEGORIES = {
  phones: {
    Apple: ['iPhone SE', 'iPhone 11', 'iPhone 12 Series', 'iPhone 13 Series', 'iPhone 14 Series', 'iPhone 15 Series'],
    Samsung: ['Galaxy A Series', 'Galaxy S Series', 'Galaxy Z Fold/Flip'],
    Tecno: ['Spark Series', 'Camon Series', 'Phantom Series', 'Pop Series'],
    Infinix: ['Hot Series', 'Note Series', 'Smart Series', 'Zero Series'],
    Itel: ['A Series', 'S Series', 'P Series (Big Battery)'],
  },
  phone_cases: {
    Apple: ['iPhone Cases'], Samsung: ['Galaxy Cases'], Oraimo: ['Universal Cases'],
  },
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
    Oraimo: ['Smart TV', 'Soundbar', 'Smart Speaker'],
  },
  home_appliances: {
    Samsung: ['Refrigerator', 'Washing Machine', 'Microwave', 'Air Conditioner'],
    Hisense: ['Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Chest Freezer', 'Washing Machine', 'Air Conditioner', 'Microwave'],
    TCL: ['Refrigerator', 'Washing Machine', 'Air Conditioner'],
    Roch: ['Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Chest Freezer', 'Washing Machine', 'Blender', 'Rice Cooker', 'Electric Kettle', 'Microwave', 'Standing Fan', 'Air Conditioner'],
    'Silver Crest': ['Blender', 'Rice Cooker', 'Electric Kettle', 'Microwave', 'Toaster', 'Sandwich Maker', 'Food Processor', 'Juicer', 'Standing Fan'],
    Nasco: ['Refrigerator', 'Chest Freezer', 'Washing Machine', 'Blender', 'Rice Cooker', 'Electric Kettle', 'Standing Fan', 'Air Conditioner'],
    Hoffman: ['Refrigerator', 'Chest Freezer', 'Washing Machine', 'Air Conditioner', 'Standing Fan', 'Blender', 'Rice Cooker', 'Electric Kettle'],
    Oraimo: ['Electric Kettle', 'Blender', 'Standing Fan', 'Rice Cooker'],
  },
};

const EMPTY_FORM = {
  name: '', description: '', price: '', original_price: '',
  main_group: '', category: '', brand: '', subcategory: '',
  stock: '', featured: false, flash_sale: false,
  donkomi: false, new_arrivals: false, top_selling: false,
  review_enabled: true, rating: '', reviews_count: '',
  image_url: '', image_urls: [], video_url: '', video_file_url: '',
  custom_brand: '', custom_subcategory: '', is_hidden: false,
};

export default function AdminProducts() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
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

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { main_group, custom_brand, custom_subcategory, ...rest } = data;
      const finalBrand = showCustomBrand && custom_brand ? custom_brand : data.brand;
      const finalSubcategory = showCustomSubcategory && custom_subcategory ? custom_subcategory : data.subcategory;
      const payload = {
        ...rest,
        brand: finalBrand,
        subcategory: finalSubcategory,
        price: parseFloat(data.price) || 0,
        original_price: data.original_price ? parseFloat(data.original_price) : undefined,
        stock: data.stock !== '' ? parseInt(data.stock) : undefined,
        rating: data.rating ? parseFloat(data.rating) : undefined,
        reviews_count: data.reviews_count ? parseInt(data.reviews_count) : undefined,
        is_hidden: data.is_hidden || false,
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
      setShowCustomBrand(false);
      setShowCustomSubcategory(false);
    },
  });

  // ── Toggle hide/show for a single product ─────────────────────────────────
  const handleToggleVisibility = async (product) => {
    setTogglingId(product.id);
    try {
      await base44.entities.Product.update(product.id, { is_hidden: !product.is_hidden });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(product.is_hidden ? 'Product is now visible to customers.' : 'Product hidden from customers.');
    } catch {
      toast.error('Failed to update visibility.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleUploadMain = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploadingMain(false);
    toast.success('Main image uploaded!');
  };

  const handleUploadExtra = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingExtra(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setForm(f => ({ ...f, image_urls: [...(f.image_urls || []), ...urls].slice(0, 4) }));
    setUploadingExtra(false);
    toast.success(`${urls.length} image(s) uploaded!`);
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { toast.error('Please upload a video file'); return; }
    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, video_file_url: file_url, video_url: '' }));
      toast.success('Video uploaded!');
    } catch {
      toast.error('Video upload failed');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    const cat = product.category || '';
    let main_group = '';
    if (cat === 'phones') main_group = 'phones';
    else if (cat === 'electronic_appliances') main_group = 'electronics';
    else if (cat === 'home_appliances') main_group = 'home_appliances_group';
    else if (cat) main_group = 'phone_accessories';

    const availableBrands = GROUP_BRANDS[main_group] || [];
    const isCustomBrand = product.brand && !availableBrands.includes(product.brand);
    const availableSubcategories = ((BRAND_SUBCATEGORIES[cat] || {})[product.brand] || []);
    const isCustomSubcategory = product.subcategory && !availableSubcategories.includes(product.subcategory) && product.subcategory !== 'Other';

    setShowCustomBrand(isCustomBrand);
    setShowCustomSubcategory(isCustomSubcategory);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      original_price: product.original_price ?? '',
      main_group,
      category: product.category || '',
      brand: isCustomBrand ? 'Other' : (product.brand || ''),
      custom_brand: isCustomBrand ? product.brand : '',
      subcategory: isCustomSubcategory ? 'Other' : (product.subcategory || ''),
      custom_subcategory: isCustomSubcategory ? product.subcategory : '',
      stock: product.stock ?? '',
      featured: product.featured || false,
      flash_sale: product.flash_sale || false,
      donkomi: product.donkomi || false,
      new_arrivals: product.new_arrivals || false,
      top_selling: product.top_selling || false,
      review_enabled: product.review_enabled !== false,
      rating: product.rating ?? '',
      reviews_count: product.reviews_count ?? '',
      image_url: product.image_url || '',
      image_urls: product.image_urls || [],
      video_url: product.video_url || '',
      video_file_url: product.video_file_url || '',
      flash_sale_end: product.flash_sale_end || '',
      is_hidden: product.is_hidden || false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNew = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowCustomBrand(false);
    setShowCustomSubcategory(false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      {/* ── FORM ──────────────────────────────────────────────────────────────── */}
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
                      {uploadingMain ? 'Uploading...' : form.image_url ? 'Replace Image' : 'Upload Image from Computer'}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadMain} disabled={uploadingMain} />
                  </label>
                  {form.image_url && <p className="text-xs text-green-600 font-medium">✓ Image uploaded</p>}
                </div>
              </div>
            </div>

            {/* Extra Images & Video */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Extra Images & Video (up to 4 images + 1 video)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(form.image_urls || []).map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, j) => j !== i) }))}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(form.video_file_url || form.video_url) && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-blue-400 bg-blue-50 flex items-center justify-center">
                    <Video className="h-6 w-6 text-blue-600" />
                    <button onClick={() => setForm(f => ({ ...f, video_file_url: '', video_url: '' }))}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {(form.image_urls || []).length < 4 && (
                  <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 transition-colors">
                    {uploadingExtra ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <Plus className="h-5 w-5 text-gray-400" />}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadExtra} disabled={uploadingExtra} />
                  </label>
                )}
                {!form.video_file_url && !form.video_url && (
                  <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center hover:border-blue-500 transition-colors bg-blue-50">
                    {uploadingVideo ? <Loader2 className="h-5 w-5 animate-spin text-blue-400" /> : <Video className="h-5 w-5 text-blue-400" />}
                    <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
                  </label>
                )}
              </div>
              {!form.video_file_url && (
                <div className="mt-2">
                  <Label className="text-xs text-gray-600">Or paste video URL (YouTube, TikTok, Vimeo, etc.)</Label>
                  <Input value={form.video_url || ''} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..." className="text-sm" />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. iPhone 14 Pro Max" />
            </div>

            {/* Step 1 */}
            <div>
              <Label>Step 1 — Main Category *</Label>
              <Select value={form.main_group} onValueChange={v => {
                setForm(f => ({ ...f, main_group: v, category: '', brand: '', subcategory: '', custom_brand: '', custom_subcategory: '' }));
                setShowCustomBrand(false); setShowCustomSubcategory(false);
              }}>
                <SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger>
                <SelectContent>
                  {MAIN_CATEGORY_GROUPS.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2 */}
            <div>
              <Label>Step 2 — Subcategory *</Label>
              <Select value={form.category} onValueChange={v => {
                setForm(f => ({ ...f, category: v, brand: '', subcategory: '', custom_brand: '', custom_subcategory: '' }));
                setShowCustomBrand(false); setShowCustomSubcategory(false);
              }} disabled={!form.main_group}>
                <SelectTrigger><SelectValue placeholder={form.main_group ? 'Select subcategory' : 'Select main category first'} /></SelectTrigger>
                <SelectContent>
                  {(GROUP_CATEGORIES[form.main_group] || []).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3 */}
            <div>
              <Label>Step 3 — Brand *</Label>
              {!showCustomBrand ? (
                <Select value={form.brand} onValueChange={v => {
                  if (v === 'Other') { setShowCustomBrand(true); setForm(f => ({ ...f, brand: 'Other', custom_brand: '' })); }
                  else { setForm(f => ({ ...f, brand: v, subcategory: '', custom_subcategory: '' })); setShowCustomSubcategory(false); }
                }} disabled={!form.category}>
                  <SelectTrigger><SelectValue placeholder={form.category ? 'Select brand' : 'Select subcategory first'} /></SelectTrigger>
                  <SelectContent>
                    {(GROUP_BRANDS[form.main_group] || []).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input value={form.custom_brand} onChange={e => setForm(f => ({ ...f, custom_brand: e.target.value }))} placeholder="Enter custom brand name" />
                  <Button size="sm" variant="outline" onClick={() => { setShowCustomBrand(false); setForm(f => ({ ...f, brand: '', custom_brand: '' })); }} className="text-xs">Choose from list</Button>
                </div>
              )}
            </div>

            {/* Step 4 */}
            <div>
              <Label>Step 4 — Product Type</Label>
              {!showCustomSubcategory ? (
                <Select value={form.subcategory} onValueChange={v => {
                  if (v === 'Other') { setShowCustomSubcategory(true); setForm(f => ({ ...f, subcategory: 'Other', custom_subcategory: '' })); }
                  else { setForm(f => ({ ...f, subcategory: v })); }
                }} disabled={!form.brand || form.brand === 'Other'}>
                  <SelectTrigger>
                    <SelectValue placeholder={form.brand === 'Other' || showCustomBrand ? 'Enter custom type below' : form.brand ? 'Select product type' : 'Select brand first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {((BRAND_SUBCATEGORIES[form.category] || {})[form.brand] || []).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input value={form.custom_subcategory} onChange={e => setForm(f => ({ ...f, custom_subcategory: e.target.value }))} placeholder="Enter custom product type" />
                  {!showCustomBrand && (
                    <Button size="sm" variant="outline" onClick={() => { setShowCustomSubcategory(false); setForm(f => ({ ...f, subcategory: '', custom_subcategory: '' })); }} className="text-xs">Choose from list</Button>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Price (₵) *</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Original Price (₵) — optional</Label>
              <Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} placeholder="Leave empty if no discount" />
            </div>
            <div>
              <Label>Stock Quantity — optional</Label>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Leave empty for unlimited" />
            </div>

            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Product description..." />
            </div>

            {/* Product Tags */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-2">Product Tags (Select where this product will appear)</Label>
              <p className="text-xs text-gray-500 mb-3">Product will ONLY show in the selected sections on the homepage</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'featured', label: '⭐ Featured', description: 'Main featured section' },
                  { key: 'flash_sale', label: '⚡ CLASSICO Deals', description: 'Flash sale section' },
                  { key: 'donkomi', label: '🔥 Donkomi Deals', description: 'Donkomi section' },
                  { key: 'new_arrivals', label: '🆕 New Arrivals', description: 'New products section' },
                  { key: 'top_selling', label: '🏆 Top Selling', description: 'Best sellers section' },
                  { key: 'review_enabled', label: '💬 Reviews Enabled', description: 'Allow customer reviews' },
                ].map(({ key, label, description }) => (
                  <label key={key} className="flex flex-col items-start cursor-pointer px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50" title={description}>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form[key] ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                        onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}>
                        {form[key] && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 ml-7">{description}</span>
                  </label>
                ))}
              </div>
              {form.flash_sale && (
                <div className="mt-3">
                  <Label>Flash Sale End Date/Time (optional)</Label>
                  <Input type="datetime-local" value={form.flash_sale_end || ''} onChange={e => setForm(f => ({ ...f, flash_sale_end: e.target.value }))} />
                </div>
              )}
            </div>

            {/* ── VISIBILITY TOGGLE IN FORM ──────────────────────────────────── */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-2">Product Visibility</Label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_hidden: !f.is_hidden }))}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all w-full max-w-xs ${
                  form.is_hidden
                    ? 'bg-gray-100 border-gray-400 text-gray-600'
                    : 'bg-green-50 border-green-500 text-green-700'
                }`}
              >
                {form.is_hidden
                  ? <><EyeOff className="h-4 w-4" /> Hidden from customers</>
                  : <><Eye className="h-4 w-4" /> Visible to customers</>
                }
                <span className="ml-auto text-[10px] font-normal text-gray-400">
                  {form.is_hidden ? 'Click to make visible' : 'Click to hide'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name || !form.price || !form.category}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
            <Button variant="outline" onClick={() => {
              setShowForm(false); setEditingProduct(null); setForm(EMPTY_FORM);
              setShowCustomBrand(false); setShowCustomSubcategory(false);
            }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── PRODUCTS GRID ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {products.map(product => (
            <Card
              key={product.id}
              className={`overflow-hidden shadow-sm hover:shadow-md transition-all ${product.is_hidden ? 'opacity-50 grayscale' : ''}`}
            >
              <div className="aspect-square bg-gray-50 relative overflow-hidden">
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>}

                {/* ── HIDDEN OVERLAY ── */}
                {product.is_hidden && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="bg-gray-900/80 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <EyeOff className="h-3 w-3" /> Hidden
                    </span>
                  </div>
                )}

                <div className="absolute top-1 left-1 flex flex-col gap-1">
                  {product.featured && <Badge className="text-[9px] px-1 py-0 bg-purple-500">Featured</Badge>}
                  {product.flash_sale && <Badge className="text-[9px] px-1 py-0 bg-orange-500">CLASSICO</Badge>}
                  {product.donkomi && <Badge className="text-[9px] px-1 py-0 bg-green-500">Donkomi</Badge>}
                  {product.new_arrivals && <Badge className="text-[9px] px-1 py-0 bg-blue-500">New</Badge>}
                  {product.top_selling && <Badge className="text-[9px] px-1 py-0 bg-yellow-600">Top</Badge>}
                </div>

                {(product.video_url || product.video_file_url) && (
                  <div className="absolute bottom-1 right-1">
                    <Video className="h-4 w-4 text-white drop-shadow-lg" />
                  </div>
                )}
              </div>

              <div className="p-2">
                <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</p>
                <p className="text-sm font-black text-gray-900">₵{product.price?.toLocaleString()}</p>
                {product.original_price && (
                  <p className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                )}
                {product.stock != null && <p className="text-[10px] text-gray-400">Stock: {product.stock}</p>}

                {/* Section tag quick-toggles */}
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {[
                    { key: 'featured', label: '⭐', title: 'Featured' },
                    { key: 'flash_sale', label: '⚡', title: 'CLASSICO Deals' },
                    { key: 'donkomi', label: '🔥', title: 'Donkomi' },
                    { key: 'new_arrivals', label: '🆕', title: 'New Arrivals' },
                    { key: 'top_selling', label: '🏆', title: 'Top Selling' },
                  ].map(({ key, label, title }) => (
                    <button
                      key={key}
                      title={`Toggle ${title}`}
                      onClick={() => base44.entities.Product.update(product.id, { [key]: !product[key] }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['products-admin'] });
                        queryClient.invalidateQueries({ queryKey: ['products'] });
                        toast.success(`${title} ${!product[key] ? 'enabled' : 'disabled'}`);
                      })}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold transition-colors ${product[key] ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-400'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── EDIT + HIDE/SHOW (no delete) ── */}
                <div className="flex gap-1 mt-1.5">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => handleEdit(product)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title={product.is_hidden ? 'Make Visible to Customers' : 'Hide from Customers'}
                    className={`h-7 px-2 text-xs gap-1 font-semibold transition-all border-2 ${
                      product.is_hidden
                        ? 'border-green-400 text-green-600 hover:bg-green-50'
                        : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                    onClick={() => handleToggleVisibility(product)}
                    disabled={togglingId === product.id}
                  >
                    {togglingId === product.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : product.is_hidden
                        ? <><Eye className="h-3 w-3" /><span>Show</span></>
                        : <><EyeOff className="h-3 w-3" /><span>Hide</span></>
                    }
                  </Button>
                </div>
              </div>
            </Card>
          ))}
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