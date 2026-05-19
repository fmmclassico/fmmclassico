import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload, X, Pencil, Plus, ImagePlus,
  Loader2, Check, Eye, EyeOff, Video,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { toast } from 'sonner';

// ── Category / Brand / Subcategory Data ──────────────────────────────────────
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

const EMPTY_FORM = {
  name: '', description: '', price: '', original_price: '',
  main_group: '', category: '', brand: '', customBrand: '', subcategory: '',
  stock: '', featured: false, flash_sale: false,
  donkomi: false, review_enabled: true, rating: '', reviews_count: '',
  image_url: '', image_urls: [], video_url: '', flash_sale_end: '',
  hidden: false,
};

// ── Upload helper ─────────────────────────────────────────────────────────────
async function uploadFile(file) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

// ── HTML → plain readable text (strips ALL tags, keeps line breaks) ───────────
// This is used ONLY for the small card preview snippet
function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Safe HTML sanitizer — used for full description rendering ─────────────────
// Keeps formatting tags, strips dangerous ones. No attributes except safe ones.
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  if (!html.includes('<')) {
    // Plain text — preserve line breaks
    return html.split('\n').filter(l => l.trim()).map(l => `<p style="margin:0 0 8px 0">${l}</p>`).join('');
  }
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const DROP = new Set(['script','style','noscript','iframe','object','embed','link','meta','title','base','canvas','svg','math','button','input','select','textarea','option','optgroup','form','head']);
    const KEEP = new Set(['p','ul','ol','li','strong','em','b','i','u','br','h1','h2','h3','h4','h5','h6','span','div','font']);
    const SAFE_ATTRS = { font: ['size','color'], span: ['style'], div: ['style'], p: ['style'] };

    function clean(node) {
      if (node.nodeType === Node.TEXT_NODE) return [node.cloneNode()];
      if (node.nodeType !== Node.ELEMENT_NODE) return [];
      const tag = node.tagName.toLowerCase();
      if (DROP.has(tag)) return [];
      const kids = Array.from(node.childNodes).flatMap(clean);
      if (!KEEP.has(tag)) return kids; // unwrap unknown tags
      const el = document.createElement(tag);
      // Only copy whitelisted attributes
      (SAFE_ATTRS[tag] || []).forEach(attr => {
        if (node.hasAttribute(attr)) el.setAttribute(attr, node.getAttribute(attr));
      });
      kids.forEach(k => el.appendChild(k));
      return [el];
    }

    const out = document.createElement('div');
    Array.from(doc.body.childNodes).flatMap(clean).forEach(n => out.appendChild(n));
    return out.innerHTML.trim();
  } catch {
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/<style[\s\S]*?<\/style>/gi, '');
  }
}

// ── Rich Text Editor ──────────────────────────────────────────────────────────
function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isTyping = useRef(false);
  const lastVal = useRef(value);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
      lastVal.current = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editorRef.current && value !== lastVal.current && !isTyping.current) {
      editorRef.current.innerHTML = value || '';
      lastVal.current = value;
    }
  }, [value]);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    const html = editorRef.current?.innerHTML || '';
    lastVal.current = html;
    onChange(html);
  };

  const handleInput = () => {
    isTyping.current = true;
    const html = editorRef.current?.innerHTML || '';
    lastVal.current = html;
    onChange(html);
    clearTimeout(handleInput._t);
    handleInput._t = setTimeout(() => { isTyping.current = false; }, 400);
  };

  // CRITICAL: Always paste as plain text only — this is what stops HTML codes appearing
  const handlePaste = (e) => {
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, plain);
    const result = editorRef.current?.innerHTML || '';
    lastVal.current = result;
    onChange(result);
  };

  const btnClass = "p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-700 text-sm font-medium select-none";

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('bold'); }} className={`${btnClass} font-bold`}>B</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('italic'); }} className={`${btnClass} italic`}>I</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('underline'); }} className={`${btnClass} underline`}>U</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('justifyLeft'); }} className={btnClass}><AlignLeft className="h-3.5 w-3.5" /></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('justifyCenter'); }} className={btnClass}><AlignCenter className="h-3.5 w-3.5" /></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('justifyRight'); }} className={btnClass}><AlignRight className="h-3.5 w-3.5" /></button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <select
          onMouseDown={e => e.stopPropagation()}
          onChange={e => exec('fontSize', e.target.value)}
          defaultValue="3"
          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
        >
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">X-Large</option>
        </select>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} className={btnClass}>• List</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('insertOrderedList'); }} className={btnClass}>1. List</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }} className="p-1.5 rounded hover:bg-gray-200 transition-colors text-xs text-gray-500">Clear</button>
      </div>
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[220px] px-4 py-3 text-sm text-gray-700 focus:outline-none"
        style={{ lineHeight: '1.75', wordBreak: 'break-word' }}
      />
    </div>
  );
}

// ── Video Preview ─────────────────────────────────────────────────────────────
function VideoPreview({ url }) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black"><iframe src={`https://www.youtube.com/embed/${yt[1]}`} className="w-full h-full" allowFullScreen title="Product Video" /></div>;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black"><iframe src={`https://player.vimeo.com/video/${vm[1]}`} className="w-full h-full" allowFullScreen title="Product Video" /></div>;
  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || url.includes('blob:')) return <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black"><video src={url} controls className="w-full h-full" /></div>;
  return <p className="text-xs text-orange-500 mt-1">⚠ Could not preview this URL. It will still be saved.</p>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [user, setUser] = React.useState(null);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState('active');

  // Local product list for INSTANT optimistic UI — no waiting for server
  const [localProducts, setLocalProducts] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  const { data: fetchedProducts = [], isLoading } = useQuery({
    queryKey: ['products-admin'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
    enabled: isAdmin,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setLocalProducts(fetchedProducts);
  }, [fetchedProducts]);

  const allProducts = localProducts ?? fetchedProducts;
  // Active = not hidden; Hidden = hidden:true
  const activeProducts = allProducts.filter(p => !p.hidden);
  const hiddenProducts = allProducts.filter(p => p.hidden);
  const displayed = activeTab === 'active' ? activeProducts : hiddenProducts;

  // ── Optimistic helpers ────────────────────────────────────────────────────
  const optimisticUpdate = (id, changes) =>
    setLocalProducts(prev => (prev ?? []).map(p => p.id === id ? { ...p, ...changes } : p));

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['products-admin'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const finalBrand =
        data.brand === 'Other' && data.customBrand?.trim() ? data.customBrand.trim()
        : data.brand === 'Other' ? '' : data.brand;
      const { main_group, customBrand, ...rest } = data;
      const payload = {
        ...rest,
        brand: finalBrand,
        description: data.description || '',   // save raw editor HTML as-is
        price: parseFloat(data.price) || 0,
        original_price: data.original_price !== '' && data.original_price != null ? parseFloat(data.original_price) : undefined,
        stock: data.stock !== '' && data.stock != null ? parseInt(data.stock, 10) : undefined,
        rating: data.rating !== '' && data.rating != null ? parseFloat(data.rating) : undefined,
        reviews_count: data.reviews_count !== '' && data.reviews_count != null ? parseInt(data.reviews_count, 10) : undefined,
        featured: Boolean(data.featured),
        flash_sale: Boolean(data.flash_sale),
        donkomi: Boolean(data.donkomi),
        review_enabled: data.review_enabled !== false,
        hidden: Boolean(data.hidden),
      };
      if (editingProduct) return base44.entities.Product.update(editingProduct.id, payload);
      return base44.entities.Product.create(payload);
    },
    onSuccess: () => {
      refetch();
      toast.success(editingProduct ? 'Product updated!' : 'Product created!');
      setShowForm(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(`Save failed: ${err?.message || 'Unknown error'}`),
  });

  // ── Visibility toggle — ONLY action besides edit ──────────────────────────
  const toggleVisibility = async (product) => {
    const next = !product.hidden;
    optimisticUpdate(product.id, { hidden: next });
    toast.success(next ? '🙈 Product hidden from users' : '👁 Product now visible to users');
    try {
      await base44.entities.Product.update(product.id, { hidden: next });
      refetch();
    } catch (err) {
      optimisticUpdate(product.id, { hidden: product.hidden }); // rollback
      toast.error('Failed to update visibility');
    }
  };

  // ── Tag toggle ────────────────────────────────────────────────────────────
  const handleTagToggle = async (product, key) => {
    const newVal = !product[key];
    const changes = { [key]: newVal };
    if (key === 'donkomi' && newVal) { changes.flash_sale = false; changes.featured = false; }
    if (key === 'flash_sale' && newVal) { changes.donkomi = false; }
    if (key === 'featured' && newVal) { changes.donkomi = false; }
    optimisticUpdate(product.id, changes);
    const label = key === 'flash_sale' ? 'Flash Sale' : key === 'featured' ? 'Featured' : 'Donkomi';
    toast.success(`${label} ${newVal ? 'enabled' : 'disabled'}`);
    try {
      await base44.entities.Product.update(product.id, changes);
      refetch();
    } catch (err) {
      optimisticUpdate(product.id, { [key]: product[key] });
      toast.error(`Failed to toggle ${label}`);
    }
  };

  // ── Upload handlers ───────────────────────────────────────────────────────
  const handleUploadMain = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingMain(true);
    try { const url = await uploadFile(file); setForm(f => ({ ...f, image_url: url })); toast.success('Image uploaded!'); }
    catch { toast.error('Image upload failed'); }
    finally { setUploadingMain(false); e.target.value = ''; }
  };

  const handleUploadExtra = async (e) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUploadingExtra(true);
    try {
      const urls = await Promise.all(files.map(f => uploadFile(f)));
      setForm(f => ({ ...f, image_urls: [...(f.image_urls || []), ...urls].slice(0, 5) }));
      toast.success(`${urls.length} image(s) uploaded!`);
    } catch { toast.error('Extra image upload failed'); }
    finally { setUploadingExtra(false); e.target.value = ''; }
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingVideo(true);
    try { const url = await uploadFile(file); setForm(f => ({ ...f, video_url: url })); toast.success('Video uploaded!'); }
    catch { toast.error('Video upload failed'); }
    finally { setUploadingVideo(false); e.target.value = ''; }
  };

  // ── Edit / New ────────────────────────────────────────────────────────────
  const handleEdit = (product) => {
    setEditingProduct(product);
    const cat = product.category || '';
    let main_group = '';
    if (cat === 'phones') main_group = 'phones';
    else if (cat === 'electronic_appliances') main_group = 'electronics';
    else if (cat === 'home_appliances') main_group = 'home_appliances_group';
    else if (cat) main_group = 'phone_accessories';
    const knownBrands = Object.values(GROUP_BRANDS).flat();
    const savedBrand = product.brand || '';
    const isKnown = knownBrands.includes(savedBrand);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      original_price: product.original_price ?? '',
      main_group,
      category: cat,
      brand: isKnown ? savedBrand : (savedBrand ? 'Other' : ''),
      customBrand: isKnown ? '' : savedBrand,
      subcategory: product.subcategory || '',
      stock: product.stock ?? '',
      featured: product.featured || false,
      flash_sale: product.flash_sale || false,
      donkomi: product.donkomi || false,
      review_enabled: product.review_enabled !== false,
      rating: product.rating ?? '',
      reviews_count: product.reviews_count ?? '',
      image_url: product.image_url || '',
      image_urls: product.image_urls || [],
      video_url: product.video_url || '',
      flash_sale_end: product.flash_sale_end || '',
      hidden: product.hidden || false,
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

  const closeForm = () => { setShowForm(false); setEditingProduct(null); setForm(EMPTY_FORM); };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === displayed.length ? [] : displayed.map(p => p.id));

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!authChecked) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Manage Products</h1>
        <Button onClick={handleNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Tabs: Active / Hidden */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setActiveTab('active'); setSelectedIds([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Active ({activeProducts.length})
        </button>
        <button
          onClick={() => { setActiveTab('hidden'); setSelectedIds([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'hidden' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <EyeOff className="h-3.5 w-3.5" /> Hidden ({hiddenProducts.length})
        </button>
      </div>

      {/* Select all bar */}
      {displayed.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={selectedIds.length === displayed.length && displayed.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4"
            />
            {selectedIds.length === displayed.length && displayed.length > 0 ? 'Deselect All' : 'Select All'}
          </label>
          {selectedIds.length > 0 && (
            <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
          )}
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <Card className="p-5 mb-8 border-2 border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg text-gray-800">
              {editingProduct ? '✏️ Edit Product' : '➕ New Product'}
            </h2>
            <button onClick={closeForm} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">

            {/* Main Image */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Main Product Image</Label>
              <div className="flex items-start gap-4">
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                  {form.image_url
                    ? <img src={form.image_url} alt="main" className="w-full h-full object-cover" />
                    : <ImagePlus className="h-8 w-8 text-gray-300" />}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors w-fit">
                      {uploadingMain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingMain ? 'Uploading…' : form.image_url ? 'Replace Image' : 'Upload Image'}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadMain} disabled={uploadingMain} />
                  </label>
                  {form.image_url && <p className="text-xs text-green-600 font-medium">✓ Image uploaded</p>}
                  {form.image_url && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="text-xs text-red-500 hover:underline">Remove image</button>
                  )}
                </div>
              </div>
            </div>

            {/* Extra Images + Video */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Extra Images (up to 5) &amp; Product Video</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(form.image_urls || []).map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt={`extra-${i}`} className="w-full h-full object-cover" />
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, j) => j !== i) }))}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(form.image_urls || []).length < 5 && (
                  <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-blue-400 transition-colors gap-0.5">
                    {uploadingExtra ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      : <><Plus className="h-4 w-4 text-gray-400" /><span className="text-[9px] text-gray-400">Image</span></>}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadExtra} disabled={uploadingExtra} />
                  </label>
                )}
                {/* Video slot */}
                <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-purple-300 flex flex-col items-center justify-center hover:border-purple-500 transition-colors gap-0.5 relative">
                  {uploadingVideo ? <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                    : form.video_url ? (
                      <>
                        <Video className="h-5 w-5 text-purple-500" />
                        <span className="text-[9px] text-purple-600 font-semibold">Replace</span>
                        <button type="button" onClick={e => { e.preventDefault(); setForm(f => ({ ...f, video_url: '' })); }}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1"><X className="h-3 w-3" /></button>
                      </>
                    ) : (
                      <><Video className="h-4 w-4 text-purple-400" /><span className="text-[9px] text-purple-400">Video</span></>
                    )}
                  <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
                </label>
              </div>
              <p className="text-[10px] text-gray-400">Slots: {(form.image_urls || []).length}/5 images · {form.video_url ? '1/1' : '0/1'} video</p>
            </div>

            {/* Product Name */}
            <div className="md:col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. P9 Wireless Bluetooth Headset" />
            </div>

            {/* Step 1 */}
            <div>
              <Label>Step 1 — Main Category *</Label>
              <Select value={form.main_group} onValueChange={v => setForm(f => ({ ...f, main_group: v, category: '', brand: '', customBrand: '', subcategory: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger>
                <SelectContent>
                  {MAIN_CATEGORY_GROUPS.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2 */}
            <div>
              <Label>Step 2 — Subcategory *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v, brand: '', customBrand: '', subcategory: '' }))} disabled={!form.main_group}>
                <SelectTrigger><SelectValue placeholder={form.main_group ? 'Select subcategory' : 'Select main category first'} /></SelectTrigger>
                <SelectContent>
                  {(GROUP_CATEGORIES[form.main_group] || []).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3 */}
            <div>
              <Label>Step 3 — Brand *</Label>
              <Select value={form.brand} onValueChange={v => setForm(f => ({ ...f, brand: v, customBrand: '', subcategory: '' }))} disabled={!form.category}>
                <SelectTrigger><SelectValue placeholder={form.category ? 'Select brand' : 'Select subcategory first'} /></SelectTrigger>
                <SelectContent>
                  {(GROUP_BRANDS[form.main_group] || []).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.brand === 'Other' && (
                <div className="mt-2">
                  <Input value={form.customBrand || ''} onChange={e => setForm(f => ({ ...f, customBrand: e.target.value }))}
                    placeholder="Type brand name e.g. Anker, Baseus…" className="border-orange-300" />
                  <p className="text-xs text-orange-500 mt-0.5">Enter the brand name manually</p>
                </div>
              )}
            </div>

            {/* Step 4 */}
            <div>
              <Label>Step 4 — Product Type</Label>
              <Select value={form.subcategory} onValueChange={v => setForm(f => ({ ...f, subcategory: v }))} disabled={!form.brand}>
                <SelectTrigger><SelectValue placeholder={form.brand ? 'Select product type' : 'Select brand first'} /></SelectTrigger>
                <SelectContent>
                  {((BRAND_SUBCATEGORIES[form.category] || {})[form.brand === 'Other' ? form.customBrand : form.brand] || []).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other / Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            <div>
              <Label>Price (₵) *</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </div>

            {/* Original Price */}
            <div>
              <Label>Original Price (₵) <span className="text-gray-400 text-xs font-normal">— for strikethrough discount</span></Label>
              <Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} placeholder="0.00" />
            </div>

            {/* Stock */}
            <div>
              <Label>Stock Quantity <span className="text-gray-400 font-normal text-xs">(optional — blank = unlimited)</span></Label>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Leave blank if unlimited" />
            </div>

            {/* Video URL */}
            <div className="md:col-span-2">
              <Label>Video URL <span className="text-gray-400 font-normal text-xs">(YouTube, Vimeo, or direct .mp4 link)</span></Label>
              <Input value={form.video_url || ''} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
              <VideoPreview url={form.video_url} />
            </div>

            {/* Description — Rich Text */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-1">
                Description
                <span className="text-xs font-normal text-gray-400 ml-2">
                  Type directly or paste plain text — use toolbar for formatting
                </span>
              </Label>
              <RichTextEditor value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
              {form.description && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer select-none">👁 Preview how description appears to customers</summary>
                  <div
                    className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.description) }}
                  />
                </details>
              )}
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-1">Product Tags</Label>
              <p className="text-xs text-amber-600 mb-3 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                ⚠ <strong>Donkomi</strong> is a separate section — enabling it will auto-disable Flash Sale &amp; Featured to prevent cross-listing.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'featured', label: '⭐ Featured' },
                  { key: 'flash_sale', label: '⚡ Flash Sale (CLASSICO Deals)' },
                  { key: 'donkomi', label: '🔥 Donkomi' },
                  { key: 'review_enabled', label: '💬 Reviews Enabled' },
                  { key: 'hidden', label: '🙈 Hide from Users' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => {
                      const newVal = !f[key];
                      const updates = { [key]: newVal };
                      if (key === 'donkomi' && newVal) { updates.flash_sale = false; updates.featured = false; }
                      if (key === 'flash_sale' && newVal) { updates.donkomi = false; }
                      if (key === 'featured' && newVal) { updates.donkomi = false; }
                      return { ...f, ...updates };
                    })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form[key]
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${form[key] ? 'border-white bg-white' : 'border-gray-400'}`}>
                      {form[key] && <Check className="h-2.5 w-2.5 text-blue-600" strokeWidth={3} />}
                    </div>
                    {label}
                  </button>
                ))}
              </div>
              {form.flash_sale && (
                <div className="mt-3">
                  <Label>Flash Sale End Date/Time <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                  <Input type="datetime-local" value={form.flash_sale_end || ''} onChange={e => setForm(f => ({ ...f, flash_sale_end: e.target.value }))} className="mt-1" />
                </div>
              )}
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name || !form.price || !form.category}
              className="bg-blue-600 hover:bg-blue-700 gap-2 px-6"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* ── PRODUCTS GRID ── */}
      {isLoading && !localProducts ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {activeTab === 'active'
            ? <p>No active products. Click "Add Product" to get started.</p>
            : <p>No hidden products.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {displayed.map(product => {
            const isSelected = selectedIds.includes(product.id);
            const tags = [
              product.featured && { key: 'featured', label: 'Featured', color: 'bg-purple-500' },
              product.flash_sale && { key: 'flash_sale', label: 'Flash', color: 'bg-orange-500' },
              product.donkomi && { key: 'donkomi', label: 'Donkomi', color: 'bg-green-500' },
            ].filter(Boolean);

            return (
              <Card key={product.id}
                className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>

                {/* Image */}
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>}
                  {/* Checkbox */}
                  <div className="absolute top-1.5 right-1.5">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 cursor-pointer accent-blue-600" onClick={e => e.stopPropagation()} />
                  </div>
                  {/* Tag badges */}
                  {tags.length > 0 && (
                    <div className="absolute top-1 left-1 flex flex-col gap-1">
                      {tags.map(tag => (
                        <Badge key={tag.key} className={`text-[9px] px-1 py-0 ${tag.color} text-white border-0`}>{tag.label}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</p>
                  <p className="text-sm font-black text-gray-900">₵{product.price?.toLocaleString()}</p>
                  {product.original_price && (
                    <p className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                  )}
                  {product.stock != null && <p className="text-[10px] text-gray-400">Stock: {product.stock}</p>}

                  {/* Description snippet — plain text, no HTML codes ever */}
                  {product.description && (
                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-tight">
                      {htmlToPlainText(product.description)}
                    </p>
                  )}

                  {/* Tag toggles */}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {[
                      { key: 'featured', label: '⭐', title: 'Featured' },
                      { key: 'flash_sale', label: '⚡', title: 'Flash Sale' },
                      { key: 'donkomi', label: '🔥', title: 'Donkomi' },
                    ].map(({ key, label, title }) => (
                      <button key={key} title={`Toggle ${title}`}
                        onClick={() => handleTagToggle(product, key)}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold transition-all ${
                          product[key] ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-400 hover:border-gray-400'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Actions: Edit + Visibility only */}
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => handleEdit(product)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>

                    {/* Visibility toggle button
                        GREEN + EyeOff = currently VISIBLE (click to hide)
                        YELLOW + Eye   = currently HIDDEN (click to show) */}
                    <button
                      title={product.hidden ? 'Hidden — click to show to users' : 'Visible — click to hide from users'}
                      onClick={() => toggleVisibility(product)}
                      className={`h-7 px-2 flex items-center justify-center rounded-md border text-xs font-medium transition-all gap-1 ${
                        product.hidden
                          ? 'bg-yellow-50 border-yellow-400 text-yellow-700 hover:bg-yellow-100'
                          : 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {product.hidden
                        ? <><Eye className="h-3.5 w-3.5" /><span className="text-[9px]">Show</span></>
                        : <><EyeOff className="h-3.5 w-3.5" /><span className="text-[9px]">Hide</span></>
                      }
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}