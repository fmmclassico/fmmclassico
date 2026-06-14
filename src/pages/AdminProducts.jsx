import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, Pencil, Plus, Trash2, ImagePlus, Loader2, Check, Video } from 'lucide-react';
import ReactQuill from 'react-quill';
import { toast } from 'sonner';

// ── STRICT CATEGORY STRUCTURE ──────────────────────────────────────────────────
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
  phones: ['Apple', 'Samsung', 'Tecno', 'Infinix', 'Itel', 'Other (type below)'],
  phone_accessories: ['Apple', 'Samsung', 'Oraimo', 'JBL', 'Sony', 'LG', 'Other (type below)'],
  electronics: ['Samsung', 'Sony', 'LG', 'TCL', 'Hisense', 'Midea', 'Other (type below)'],
  home_appliances_group: ['Samsung', 'LG', 'Hisense', 'TCL', 'Midea', 'Roch', 'Silver Crest', 'Nasco', 'Hoffman', 'Other (type below)'],
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
  power_banks: { Oraimo: ['Power Bank 10,000mAh', 'Power Bank 20,000mAh', 'Solar Power Bank'], Samsung: ['Samsung Power Bank'] },
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

const HOME_SECTIONS = [
  { key: 'flash_sale', label: '⚡ CLASSICO Deals (Flash Sale)' },
  { key: 'featured',   label: '⭐ Featured / Classico Picks' },
  { key: 'donkomi',    label: '🔥 Donkomi Deals (Best Prices)' },
  { key: 'new_arrival', label: '🆕 New Arrivals' },
  { key: 'top_selling', label: '📈 Top Selling' },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ font: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['clean'],
  ],
};

const EMPTY_FORM = {
  name: '', description: '', price: '', original_price: '',
  main_group: '', category: '', brand: '', custom_brand: '', subcategory: '', custom_subcategory: '',
  stock: '', home_sections: [], review_enabled: true, rating: '', reviews_count: '',
  image_url: '', image_urls: [], video_url: '',
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
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    }).catch(() => {
      // If auth check fails, set a non-null user placeholder so page doesn't spin forever
      setUser({ role: 'guest' });
    });
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-admin'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { main_group, home_sections, custom_brand, custom_subcategory, ...rest } = data;
      const sections = home_sections || [];
      // Use custom value if "Other (type below)" was selected
      const finalBrand = rest.brand === 'Other (type below)' ? (custom_brand || 'Other') : rest.brand;
      const finalSubcategory = rest.subcategory === '__custom__' ? (custom_subcategory || '') : rest.subcategory;
      const payload = {
        ...rest,
        brand: finalBrand,
        subcategory: finalSubcategory,
        price: parseFloat(data.price) || 0,
        original_price: data.original_price ? parseFloat(data.original_price) : undefined,
        stock: data.stock !== '' ? parseInt(data.stock) : undefined,
        rating: data.rating ? parseFloat(data.rating) : undefined,
        reviews_count: data.reviews_count ? parseInt(data.reviews_count) : undefined,
        featured:   sections.includes('featured'),
        flash_sale: sections.includes('flash_sale'),
        donkomi:    sections.includes('donkomi'),
        new_arrival: sections.includes('new_arrival'),
        top_selling: sections.includes('top_selling'),
      };
      if (editingProduct) {
        return base44.entities.Product.update(editingProduct.id, payload);
      }
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
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['products'] });
      queryClient.removeQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      toast.success('Product deleted');
    }
  });

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
    setForm(f => ({ ...f, image_urls: [...(f.image_urls || []), ...urls] }));
    setUploadingExtra(false);
    toast.success(`${urls.length} image(s) uploaded!`);
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, video_url: file_url }));
    setUploadingVideo(false);
    toast.success('Video uploaded!');
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    const cat = product.category || '';
    let main_group = '';
    if (cat === 'phones') main_group = 'phones';
    else if (cat === 'electronic_appliances') main_group = 'electronics';
    else if (cat === 'home_appliances') main_group = 'home_appliances_group';
    else if (cat) main_group = 'phone_accessories';

    const home_sections = [];
    if (product.featured)    home_sections.push('featured');
    if (product.flash_sale)  home_sections.push('flash_sale');
    if (product.donkomi)     home_sections.push('donkomi');
    if (product.new_arrival) home_sections.push('new_arrival');
    if (product.top_selling) home_sections.push('top_selling');

    // Determine if brand is a custom one
    const knownBrands = GROUP_BRANDS[main_group] || [];
    const knownBrandNames = knownBrands.map(b => b.replace(' (type below)', ''));
    const brandIsKnown = knownBrandNames.includes(product.brand);
    const brandValue = brandIsKnown ? product.brand : 'Other (type below)';
    const customBrand = brandIsKnown ? '' : (product.brand || '');

    // Determine if subcategory is a known one
    const knownSubs = ((BRAND_SUBCATEGORIES[product.category] || {})[product.brand] || []);
    const subIsKnown = knownSubs.includes(product.subcategory);
    const subValue = subIsKnown ? product.subcategory : (product.subcategory ? '__custom__' : '');
    const customSub = subIsKnown ? '' : (product.subcategory || '');

    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      original_price: product.original_price ?? '',
      main_group,
      category: product.category || '',
      brand: brandValue,
      custom_brand: customBrand,
      subcategory: subValue,
      custom_subcategory: customSub,
      stock: product.stock ?? '',
      home_sections,
      review_enabled: product.review_enabled !== false,
      rating: product.rating ?? '',
      reviews_count: product.reviews_count ?? '',
      image_url: product.image_url || '',
      image_urls: product.image_urls || [],
      video_url: product.video_url || '',
      flash_sale_end: product.flash_sale_end || '',
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

  if (!isAdmin && user) {
    return <div className="p-8 text-center text-gray-500">Admin access required.</div>;
  }
  if (!user) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  }

  const availableSubcategories = ((BRAND_SUBCATEGORIES[form.category] || {})[
    form.brand === 'Other (type below)' ? (form.custom_brand || '') : form.brand
  ] || []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Products</h1>
        <Button onClick={handleNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-5 mb-8 border-2 border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-gray-800">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
            <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Main Image Upload */}
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
                      {uploadingMain ? 'Uploading...' : form.image_url ? 'Replace Image' : 'Upload Main Image'}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadMain} disabled={uploadingMain} />
                  </label>
                  {form.image_url && <p className="text-xs text-green-600 font-medium">✓ Main image uploaded</p>}
                </div>
              </div>
            </div>

            {/* Extra Images — unlimited */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Extra Product Images (upload as many as you want)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(form.image_urls || []).map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, j) => j !== i) }))}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 transition-colors">
                  {uploadingExtra ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <Plus className="h-5 w-5 text-gray-400" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadExtra} disabled={uploadingExtra} />
                </label>
              </div>
              <p className="text-xs text-gray-400">Click + to add images. No limit. Click X on an image to remove it.</p>
            </div>

            {/* Video Upload */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Product Video (optional)</Label>
              <div className="flex items-start gap-4">
                {form.video_url && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <Video className="h-5 w-5 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">Video uploaded ✓</span>
                    <button onClick={() => setForm(f => ({ ...f, video_url: '' }))} className="ml-1 text-red-400 hover:text-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-300 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors w-fit">
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                    {uploadingVideo ? 'Uploading video...' : form.video_url ? 'Replace Video' : 'Upload Video from Computer'}
                  </div>
                  <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. iPhone 14 Pro Max" />
            </div>

            {/* ── STEP 1: Main Category Group ── */}
            <div>
              <Label>Step 1 — Main Category *</Label>
              <Select value={form.main_group} onValueChange={v => setForm(f => ({ ...f, main_group: v, category: '', brand: '', custom_brand: '', subcategory: '', custom_subcategory: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger>
                <SelectContent>
                  {MAIN_CATEGORY_GROUPS.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ── STEP 2: Subcategory ── */}
            <div>
              <Label>Step 2 — Subcategory *</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm(f => ({ ...f, category: v, brand: '', custom_brand: '', subcategory: '', custom_subcategory: '' }))}
                disabled={!form.main_group}
              >
                <SelectTrigger><SelectValue placeholder={form.main_group ? 'Select subcategory' : 'Select main category first'} /></SelectTrigger>
                <SelectContent>
                  {(GROUP_CATEGORIES[form.main_group] || []).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ── STEP 3: Brand ── */}
            <div>
              <Label>Step 3 — Brand *</Label>
              <Select
                value={form.brand}
                onValueChange={v => setForm(f => ({ ...f, brand: v, custom_brand: '', subcategory: '', custom_subcategory: '' }))}
                disabled={!form.category}
              >
                <SelectTrigger><SelectValue placeholder={form.category ? 'Select brand' : 'Select subcategory first'} /></SelectTrigger>
                <SelectContent>
                  {(GROUP_BRANDS[form.main_group] || []).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.brand === 'Other (type below)' && (
                <Input
                  className="mt-2"
                  placeholder="Type your brand name..."
                  value={form.custom_brand}
                  onChange={e => setForm(f => ({ ...f, custom_brand: e.target.value }))}
                />
              )}
            </div>

            {/* ── STEP 4: Product Type ── */}
            <div>
              <Label>Step 4 — Product Type / Subcategory</Label>
              <Select
                value={form.subcategory}
                onValueChange={v => setForm(f => ({ ...f, subcategory: v, custom_subcategory: '' }))}
                disabled={!form.brand}
              >
                <SelectTrigger><SelectValue placeholder={form.brand ? 'Select product type' : 'Select brand first'} /></SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">✏️ Type my own...</SelectItem>
                </SelectContent>
              </Select>
              {form.subcategory === '__custom__' && (
                <Input
                  className="mt-2"
                  placeholder="Type product type/subcategory..."
                  value={form.custom_subcategory}
                  onChange={e => setForm(f => ({ ...f, custom_subcategory: e.target.value }))}
                />
              )}
            </div>

            <div>
              <Label>Price (₵) *</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Original Price (₵) — for discount display</Label>
              <Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="e.g. 20" />
            </div>

            {/* Description — Rich Text Editor */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-2">Description (Rich Text)</Label>
              <p className="text-xs text-gray-500 mb-2">Use the toolbar to format text with bold, bullets, headings, font size, and more. The description will appear exactly as styled to customers.</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden admin-quill">
                <ReactQuill
                  theme="snow"
                  value={form.description}
                  onChange={val => setForm(f => ({ ...f, description: val }))}
                  modules={QUILL_MODULES}
                  placeholder="Write a detailed, well-formatted product description..."
                />
              </div>
            </div>

            {/* Homepage Sections */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-1">📍 Homepage Sections</Label>
              <p className="text-xs text-gray-500 mb-3">Select which sections this product appears in.</p>
              <div className="flex flex-wrap gap-3">
                {HOME_SECTIONS.map(({ key, label }) => {
                  const checked = (form.home_sections || []).includes(key);
                  return (
                    <label key={key} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      onClick={() => setForm(f => {
                        const sections = f.home_sections || [];
                        return { ...f, home_sections: checked ? sections.filter(s => s !== key) : [...sections, key] };
                      })}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </label>
                  );
                })}
              </div>
              {(form.home_sections || []).includes('flash_sale') && (
                <div className="mt-3">
                  <Label>Flash Sale End Date/Time (optional)</Label>
                  <Input type="datetime-local" value={form.flash_sale_end || ''} onChange={e => setForm(f => ({ ...f, flash_sale_end: e.target.value }))} />
                </div>
              )}
            </div>

            {/* Reviews */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-2">Other Settings</Label>
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors inline-flex ${form.review_enabled ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setForm(f => ({ ...f, review_enabled: !f.review_enabled }))}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.review_enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {form.review_enabled && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm font-medium text-gray-700">💬 Reviews Enabled</span>
              </label>
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
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingProduct(null); setForm(EMPTY_FORM); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Products List */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {products.map(product => (
            <Card key={product.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-50 relative overflow-hidden">
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>}
                <div className="absolute top-1 left-1 flex flex-col gap-1">
                  {product.featured    && <Badge className="text-[9px] px-1 py-0 bg-purple-500">Featured</Badge>}
                  {product.flash_sale  && <Badge className="text-[9px] px-1 py-0 bg-orange-500">Flash</Badge>}
                  {product.donkomi     && <Badge className="text-[9px] px-1 py-0 bg-green-500">Donkomi</Badge>}
                  {product.new_arrival && <Badge className="text-[9px] px-1 py-0 bg-yellow-500">New</Badge>}
                  {product.top_selling && <Badge className="text-[9px] px-1 py-0 bg-blue-500">Top</Badge>}
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</p>
                <p className="text-sm font-black text-gray-900">₵{product.price?.toLocaleString()}</p>
                {product.stock != null && <p className="text-[10px] text-gray-400">Stock: {product.stock}</p>}
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => handleEdit(product)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => {
                    if (confirm('Delete this product?')) deleteMutation.mutate(product.id);
                  }}>
                    <Trash2 className="h-3 w-3" />
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