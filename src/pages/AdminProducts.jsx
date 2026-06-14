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
import { Upload, X, Pencil, Plus, ImagePlus, Loader2, Check, Video, Eye, EyeOff } from 'lucide-react';
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

// All subcategories per category (not brand-dependent — show all options + "Other")
const CATEGORY_SUBCATEGORIES = {
  phones: [
    'iPhone SE', 'iPhone 11', 'iPhone 12 Series', 'iPhone 13 Series', 'iPhone 14 Series', 'iPhone 15 Series', 'iPhone 16 Series',
    'Galaxy A Series', 'Galaxy S Series', 'Galaxy Z Fold/Flip',
    'Tecno Spark Series', 'Tecno Camon Series', 'Tecno Phantom Series', 'Tecno Pop Series',
    'Infinix Hot Series', 'Infinix Note Series', 'Infinix Smart Series', 'Infinix Zero Series',
    'Itel A Series', 'Itel S Series', 'Itel P Series (Big Battery)',
  ],
  phone_cases: [
    'iPhone Cases', 'Samsung Galaxy Cases', 'Tecno Cases', 'Infinix Cases', 'Universal Cases',
    'Clear Cases', 'Leather Cases', 'Wallet Cases', 'Rugged / Armor Cases', 'Silicone Cases',
  ],
  chargers: [
    'Apple 20W Charger', 'MagSafe Charger', 'Apple Car Charger',
    'Samsung Fast Charger', 'Samsung Wireless Charger',
    'Oraimo Fast Charger 20W', 'Oraimo Car Charger', 'Oraimo Wireless Charger', 'Oraimo Multi-port Charger',
    'USB-C Charger', 'USB-A Charger', 'Wireless Charger', 'Car Charger', 'Desktop / Travel Charger',
  ],
  earphones: [
    'AirPods', 'AirPods Pro', 'AirPods Max',
    'Samsung Galaxy Buds', 'Samsung Galaxy Buds Pro',
    'Oraimo FreePods (Wireless Earbuds)', 'Oraimo Neckband Earphones', 'Oraimo Wired Earphones', 'Oraimo Bluetooth Headphones',
    'JBL Tune Earbuds', 'JBL Free X', 'JBL Live Series', 'JBL Wired Earphones',
    'Sony WF Series (Earbuds)', 'Sony WH Series (Headphones)', 'Sony Wired Earphones',
    'Wired Earphones', 'Wireless Earbuds', 'Over-Ear Headphones', 'Neckband / Sports Earphones',
  ],
  cables: [
    'Lightning Cable', 'USB-C to Lightning', 'USB-C Cable', 'Micro USB Cable',
    'Braided Cable', 'Samsung Data Cable', 'Fast Charging Cable', 'Data Transfer Cable', '3-in-1 Cable',
  ],
  power_banks: [
    'Power Bank 5,000mAh', 'Power Bank 10,000mAh', 'Power Bank 20,000mAh', 'Solar Power Bank',
    'Mini Power Bank', 'Fast Charge Power Bank', 'Wireless Power Bank',
  ],
  screen_protectors: [
    'iPhone Screen Protector', 'Samsung Galaxy Screen Protector', 'Universal Screen Protector',
    'Tempered Glass', 'Anti-Glare Screen Protector', 'Privacy Screen Protector', 'Camera Lens Protector',
  ],
  holders: [
    'Car Phone Holder', 'Desk Stand / Phone Stand', 'Ring Holder', 'Tripod Stand',
    'Dashboard Mount', 'Windshield Mount', 'Vent Clip Holder',
  ],
  speakers: [
    'JBL Go', 'JBL Flip', 'JBL Charge', 'JBL Xtreme', 'JBL PartyBox',
    'Sony Portable Speaker', 'Sony Party Speaker',
    'Oraimo Bluetooth Speaker', 'Oraimo Mini Speaker',
    'Portable Bluetooth Speaker', 'Party / Large Speaker', 'Mini Speaker', 'Soundbar',
  ],
  smart_watches: [
    'Apple Watch SE', 'Apple Watch Series 8', 'Apple Watch Series 9', 'Apple Watch Ultra',
    'Samsung Galaxy Watch', 'Oraimo Watch', 'Oraimo Watch Pro',
    'Fitness Tracker / Band', 'Smart Watch with Calling', 'Kids Smart Watch',
  ],
  electronic_appliances: [
    'Smart TV 24"', 'Smart TV 32"', 'Smart TV 43"', 'Smart TV 50"', 'Smart TV 55"', 'Smart TV 65"', 'Smart TV 75"',
    '4K UHD TV', 'OLED TV', 'QLED TV', 'Android TV',
    'Soundbar', 'Home Theatre',
    'Air Conditioner Split Unit', 'Air Purifier',
    'Projector', 'Digital Camera', 'Laptop', 'Desktop Computer',
  ],
  home_appliances: [
    'Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Refrigerator (Side-by-Side)',
    'Chest Freezer', 'Upright Freezer',
    'Washing Machine (Front Load)', 'Washing Machine (Top Load)',
    'Air Conditioner (Window)', 'Air Conditioner (Split Unit)',
    'Microwave Oven', 'Electric Oven',
    'Blender', 'Rice Cooker', 'Electric Kettle', 'Toaster', 'Sandwich Maker',
    'Food Processor', 'Juicer', 'Hand Mixer',
    'Standing Fan', 'Ceiling Fan', 'Table Fan', 'Tower Fan',
    'Water Dispenser', 'Iron',
  ],
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

const PRESET_COLORS = ['Black','White','Red','Blue','Green','Yellow','Gold','Silver','Rose Gold','Purple','Orange','Pink','Navy','Grey','Clear/Transparent'];

const EMPTY_FORM = {
  name: '', description: '', price: '', original_price: '',
  main_group: '', category: '', brand: '', custom_brand: '', subcategory: '', custom_subcategory: '',
  stock: '', home_sections: [], review_enabled: true, rating: '', reviews_count: '',
  image_url: '', image_urls: [], video_url: '', is_visible: true,
  show_colors: false, available_colors: [], color_input: '',
  show_wattage: false, available_wattage: [], wattage_input: '',
  show_type: false, available_types: [], type_input: '',
};

export default function AdminProducts() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
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
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { main_group, home_sections, custom_brand, custom_subcategory, color_input, wattage_input, type_input, ...rest } = data;
      const sections = home_sections || [];
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
        is_visible: data.is_visible !== false,
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

  // Quick visibility toggle from the product list (no form needed)
  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, is_visible }) => base44.entities.Product.update(id, { is_visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
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

    const knownBrands = GROUP_BRANDS[main_group] || [];
    const knownBrandNames = knownBrands.map(b => b.replace(' (type below)', ''));
    const brandIsKnown = knownBrandNames.includes(product.brand);
    const brandValue = brandIsKnown ? product.brand : 'Other (type below)';
    const customBrand = brandIsKnown ? '' : (product.brand || '');

    const knownSubs = CATEGORY_SUBCATEGORIES[cat] || [];
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
      is_visible: product.is_visible !== false,
      show_colors: product.show_colors || false,
      available_colors: product.available_colors || [],
      color_input: '',
      show_wattage: product.show_wattage || false,
      available_wattage: product.available_wattage || [],
      wattage_input: '',
      show_type: product.show_type || false,
      available_types: product.available_types || [],
      type_input: '',
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

  if (user && !isAdmin) {
    return <div className="p-8 text-center text-gray-500">Admin access required.</div>;
  }

  const availableSubcategories = CATEGORY_SUBCATEGORIES[form.category] || [];

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

            {/* Extra Images */}
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

            {/* Video Upload or URL */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Product Video (optional)</Label>
              
              {/* Video URL paste — supports YouTube, TikTok, Instagram, Pinterest, Snapchat, etc. */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1.5">📎 Paste a video link from YouTube, TikTok, Instagram, Pinterest, Snapchat, or any platform:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. https://www.youtube.com/watch?v=... or https://www.tiktok.com/..."
                    value={form.video_url && !form.video_url.startsWith('http') ? '' : (form.video_url || '')}
                    onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                    className="text-sm"
                  />
                  {form.video_url && (
                    <button onClick={() => setForm(f => ({ ...f, video_url: '' }))} className="text-red-400 hover:text-red-600 flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR upload from computer</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <div className="flex items-start gap-4">
                {form.video_url && (form.video_url.startsWith('blob:') || (!form.video_url.includes('youtube') && !form.video_url.includes('tiktok') && !form.video_url.includes('youtu.be') && !form.video_url.includes('instagram') && !form.video_url.includes('pinterest') && !form.video_url.includes('snapchat') && !form.video_url.includes('vimeo') && !form.video_url.includes('facebook') && form.video_url.startsWith('https://') && !form.video_url.startsWith('https://www.youtube') && !form.video_url.startsWith('https://youtu'))) && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <Video className="h-5 w-5 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">Video file uploaded ✓</span>
                  </div>
                )}
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-300 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors w-fit">
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                    {uploadingVideo ? 'Uploading video...' : 'Upload Video File'}
                  </div>
                  <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
                </label>
              </div>

              {form.video_url && (
                <p className="text-xs text-green-600 mt-2 font-medium">✓ Video set: {form.video_url.length > 60 ? form.video_url.slice(0, 60) + '...' : form.video_url}</p>
              )}
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

            {/* ── STEP 2: Category ── */}
            <div>
              <Label>Step 2 — Category *</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm(f => ({ ...f, category: v, brand: '', custom_brand: '', subcategory: '', custom_subcategory: '' }))}
                disabled={!form.main_group}
              >
                <SelectTrigger><SelectValue placeholder={form.main_group ? 'Select category' : 'Select main category first'} /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder={form.category ? 'Select brand' : 'Select category first'} /></SelectTrigger>
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

            {/* ── STEP 4: Product Type / Subcategory ── */}
            <div>
              <Label>Step 4 — Product Type / Subcategory</Label>
              <Select
                value={form.subcategory}
                onValueChange={v => setForm(f => ({ ...f, subcategory: v, custom_subcategory: '' }))}
                disabled={!form.category}
              >
                <SelectTrigger><SelectValue placeholder={form.category ? 'Select product type' : 'Select category first'} /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {availableSubcategories.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">✏️ Other (type my own...)</SelectItem>
                </SelectContent>
              </Select>
              {form.subcategory === '__custom__' && (
                <Input
                  className="mt-2"
                  placeholder="Type product type / subcategory..."
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

            {/* Stock — with 0-stock explanation */}
            <div className="md:col-span-2">
              <Label>Stock Quantity</Label>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Leave empty = unlimited / no stock tracking" className="mb-1" />
              <p className="text-xs text-gray-400">
                <strong>Empty</strong> = no stock tracking (always shown). <strong>0</strong> = out of stock (hidden from customers). <strong>1+</strong> = shown with that quantity available.
              </p>
            </div>

            {/* Description — Rich Text Editor */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-2">Description (Rich Text)</Label>
              <p className="text-xs text-gray-500 mb-2">Use the toolbar to format text with bold, bullets, headings, font size, and more.</p>
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

            {/* ── CUSTOMER OPTIONS: Colors / Wattage / Type ── */}
            <div className="md:col-span-2 space-y-4">
              <Label className="font-semibold block">🎨 Customer Options (optional)</Label>
              <p className="text-xs text-gray-400 -mt-3">Enable any option to let customers choose before adding to cart. Leave off if not applicable.</p>

              {/* Colors */}
              <div className="border rounded-xl p-3 space-y-2">
                <label className={`flex items-center gap-2 cursor-pointer`}
                  onClick={() => setForm(f => ({ ...f, show_colors: !f.show_colors }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.show_colors ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {form.show_colors && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-medium text-sm text-gray-700">Show Color Options to Customers</span>
                </label>
                {form.show_colors && (
                  <div className="pt-1 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            available_colors: f.available_colors.includes(c)
                              ? f.available_colors.filter(x => x !== c)
                              : [...f.available_colors, c]
                          }))}
                          className={`text-xs px-2 py-1 rounded-full border transition-all ${form.available_colors.includes(c) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={form.color_input || ''} onChange={e => setForm(f => ({ ...f, color_input: e.target.value }))}
                        placeholder="Add custom color..." className="h-8 text-xs flex-1" />
                      <Button type="button" size="sm" className="h-8 text-xs" onClick={() => {
                        if (!form.color_input?.trim()) return;
                        setForm(f => ({ ...f, available_colors: [...new Set([...f.available_colors, f.color_input.trim()])], color_input: '' }));
                      }}>Add</Button>
                    </div>
                    {form.available_colors.length > 0 && (
                      <p className="text-xs text-green-600">Selected: {form.available_colors.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Wattage */}
              <div className="border rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setForm(f => ({ ...f, show_wattage: !f.show_wattage }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.show_wattage ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {form.show_wattage && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-medium text-sm text-gray-700">Show Wattage Options to Customers</span>
                </label>
                {form.show_wattage && (
                  <div className="pt-1 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {['5W','10W','18W','20W','25W','33W','45W','65W','100W','120W','150W'].map(w => (
                        <button key={w} type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            available_wattage: f.available_wattage.includes(w)
                              ? f.available_wattage.filter(x => x !== w)
                              : [...f.available_wattage, w]
                          }))}
                          className={`text-xs px-2 py-1 rounded-full border transition-all ${form.available_wattage.includes(w) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                          {w}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={form.wattage_input || ''} onChange={e => setForm(f => ({ ...f, wattage_input: e.target.value }))}
                        placeholder="Custom wattage e.g. 30W..." className="h-8 text-xs flex-1" />
                      <Button type="button" size="sm" className="h-8 text-xs" onClick={() => {
                        if (!form.wattage_input?.trim()) return;
                        setForm(f => ({ ...f, available_wattage: [...new Set([...f.available_wattage, f.wattage_input.trim()])], wattage_input: '' }));
                      }}>Add</Button>
                    </div>
                    {form.available_wattage.length > 0 && (
                      <p className="text-xs text-green-600">Selected: {form.available_wattage.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Type */}
              <div className="border rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setForm(f => ({ ...f, show_type: !f.show_type }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.show_type ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {form.show_type && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-medium text-sm text-gray-700">Show Type/Variant Options to Customers</span>
                </label>
                {form.show_type && (
                  <div className="pt-1 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {['USB-C','Lightning','Micro USB','Type-A','Wireless','Original','Compatible','Standard','Pro','Plus','Max'].map(t => (
                        <button key={t} type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            available_types: f.available_types.includes(t)
                              ? f.available_types.filter(x => x !== t)
                              : [...f.available_types, t]
                          }))}
                          className={`text-xs px-2 py-1 rounded-full border transition-all ${form.available_types.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={form.type_input || ''} onChange={e => setForm(f => ({ ...f, type_input: e.target.value }))}
                        placeholder="Custom type e.g. 256GB..." className="h-8 text-xs flex-1" />
                      <Button type="button" size="sm" className="h-8 text-xs" onClick={() => {
                        if (!form.type_input?.trim()) return;
                        setForm(f => ({ ...f, available_types: [...new Set([...f.available_types, f.type_input.trim()])], type_input: '' }));
                      }}>Add</Button>
                    </div>
                    {form.available_types.length > 0 && (
                      <p className="text-xs text-green-600">Selected: {form.available_types.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Other Settings */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-2">Other Settings</Label>
              <div className="flex flex-wrap gap-3">
                {/* Reviews toggle */}
                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${form.review_enabled ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setForm(f => ({ ...f, review_enabled: !f.review_enabled }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.review_enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {form.review_enabled && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">💬 Reviews Enabled</span>
                </label>

                {/* Visibility toggle */}
                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${form.is_visible ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}
                  onClick={() => setForm(f => ({ ...f, is_visible: !f.is_visible }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.is_visible ? 'bg-green-600 border-green-600' : 'border-red-400 bg-red-100'}`}>
                    {form.is_visible ? <Eye className="h-3 w-3 text-white" /> : <EyeOff className="h-3 w-3 text-red-500" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {form.is_visible ? '👁️ Visible to Customers' : '🚫 Hidden from Customers'}
                  </span>
                </label>
              </div>
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
          {products.map(product => {
            const isHidden = product.is_visible === false;
            const isOutOfStock = product.stock != null && product.stock === 0;
            return (
              <Card key={product.id} className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isHidden ? 'opacity-60 border-dashed border-red-300' : ''}`}>
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>}
                  <div className="absolute top-1 left-1 flex flex-col gap-1">
                    {product.featured    && <Badge className="text-[9px] px-1 py-0 bg-purple-500">Featured</Badge>}
                    {product.flash_sale  && <Badge className="text-[9px] px-1 py-0 bg-orange-500">Flash</Badge>}
                    {product.donkomi     && <Badge className="text-[9px] px-1 py-0 bg-green-500">Donkomi</Badge>}
                    {product.new_arrival && <Badge className="text-[9px] px-1 py-0 bg-yellow-500">New</Badge>}
                    {product.top_selling && <Badge className="text-[9px] px-1 py-0 bg-blue-500">Top</Badge>}
                  </div>
                  {/* Visibility / stock badge */}
                  <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
                    {isHidden && <Badge className="text-[9px] px-1 py-0 bg-red-500">Hidden</Badge>}
                    {isOutOfStock && !isHidden && <Badge className="text-[9px] px-1 py-0 bg-gray-500">Out of Stock</Badge>}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</p>
                  <p className="text-sm font-black text-gray-900">₵{product.price?.toLocaleString()}</p>
                  {product.stock != null && (
                    <p className={`text-[10px] font-medium ${product.stock === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      Stock: {product.stock === 0 ? 'Out of Stock' : product.stock}
                    </p>
                  )}
                  <div className="flex gap-1 mt-2">
                    {/* Visibility toggle button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 w-7 p-0 flex-shrink-0 ${isHidden ? 'text-red-500 border-red-300 hover:bg-red-50' : 'text-green-600 border-green-300 hover:bg-green-50'}`}
                      title={isHidden ? 'Hidden — click to show' : 'Visible — click to hide'}
                      onClick={() => toggleVisibilityMutation.mutate({ id: product.id, is_visible: !product.is_visible })}
                    >
                      {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
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