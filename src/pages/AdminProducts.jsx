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
  Upload, X, Pencil, Plus, Trash2, ImagePlus,
  Loader2, Check, Eye, EyeOff, RotateCcw, Video,
  Bold, AlignLeft, AlignCenter, AlignRight
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
  hidden: false, deleted: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uploadFile(file) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

/**
 * Deep-clean HTML — keeps only safe semantic tags with NO attributes.
 * Returns clean HTML safe for dangerouslySetInnerHTML.
 */
function sanitizeHtml(html) {
  if (!html) return '';

  // Strip HTML comments
  let cleaned = html.replace(/<!--[\s\S]*?-->/g, '');

  // Parse into DOM
  const doc = new DOMParser().parseFromString(cleaned, 'text/html');

  const UNWRAP_TAGS = new Set([
    'div', 'section', 'article', 'aside', 'main', 'header', 'footer', 'nav',
    'span', 'figure', 'figcaption', 'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col',
    'form', 'fieldset', 'label', 'a', 'abbr', 'cite', 'time', 'mark',
    'address', 'details', 'summary', 'dialog', 'template',
    'html', 'body', 'head',
  ]);

  const DROP_TAGS = new Set([
    'script', 'style', 'noscript', 'iframe', 'object', 'embed',
    'link', 'meta', 'title', 'base', 'canvas', 'svg', 'math',
    'button', 'input', 'select', 'textarea', 'option', 'optgroup',
  ]);

  const KEEP_TAGS = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'ul', 'ol', 'li',
    'strong', 'em', 'b', 'i', 'u', 'br',
    'font', // keep font for execCommand fontSize support
  ]);

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return [node.cloneNode()];
    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const tag = node.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) return [];

    const cleanChildren = Array.from(node.childNodes).flatMap(processNode);

    if (KEEP_TAGS.has(tag)) {
      const el = document.createElement(tag);
      // Only keep size attribute on font (for execCommand fontSize)
      if (tag === 'font' && node.getAttribute('size')) {
        el.setAttribute('size', node.getAttribute('size'));
      }
      cleanChildren.forEach(c => el.appendChild(c));
      return [el];
    }

    // unwrap — keep children, discard wrapper
    return cleanChildren;
  }

  const resultNodes = Array.from(doc.body.childNodes).flatMap(processNode);
  const container = document.createElement('div');
  resultNodes.forEach(n => container.appendChild(n));

  let result = container.innerHTML;

  // Collapse excessive whitespace / empty tags
  result = result
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .replace(/(<p>\s*<\/p>\s*){2,}/gi, '<p></p>')
    .replace(/(<p>\s*<br\s*\/?>\s*<\/p>\s*){2,}/gi, '')
    .trim();

  return result;
}

// ── Rich Text Editor ──────────────────────────────────────────────────────────
function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isUserTyping = useRef(false);
  const lastExternalValue = useRef(value);

  // Initialize editor content once on mount only
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
      lastExternalValue.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. switching products) without clobbering typing
  useEffect(() => {
    if (
      editorRef.current &&
      value !== lastExternalValue.current &&
      !isUserTyping.current
    ) {
      editorRef.current.innerHTML = value || '';
      lastExternalValue.current = value;
    }
  }, [value]);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    const html = editorRef.current?.innerHTML || '';
    lastExternalValue.current = html;
    onChange(html);
  };

  const handleInput = () => {
    isUserTyping.current = true;
    const html = editorRef.current?.innerHTML || '';
    lastExternalValue.current = html;
    onChange(html);
    clearTimeout(handleInput._timer);
    handleInput._timer = setTimeout(() => { isUserTyping.current = false; }, 300);
  };

  // FIX: Paste only plain text to avoid injecting raw HTML tags into the description
  const handlePaste = (e) => {
    e.preventDefault();
    // Always paste as plain text — this prevents HTML code leaking into description
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    const result = editorRef.current?.innerHTML || '';
    lastExternalValue.current = result;
    onChange(result);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <button type="button" title="Bold" onClick={() => exec('bold')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Italic" onClick={() => exec('italic')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors font-serif italic text-sm font-bold">I</button>
        <button type="button" title="Underline" onClick={() => exec('underline')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors underline text-sm font-bold">U</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" title="Align Left" onClick={() => exec('justifyLeft')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Align Center" onClick={() => exec('justifyCenter')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Align Right" onClick={() => exec('justifyRight')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <AlignRight className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <select
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
        <button type="button" title="Bullet List" onClick={() => exec('insertUnorderedList')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-sm font-bold">• List</button>
        <button type="button" title="Numbered List" onClick={() => exec('insertOrderedList')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-sm font-bold">1. List</button>
        <button type="button" title="Clear Formatting" onClick={() => exec('removeFormat')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-xs text-gray-500">Clear</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[150px] px-3 py-2 text-sm text-gray-700 focus:outline-none"
        style={{ lineHeight: '1.6' }}
      />
    </div>
  );
}

// ── Video Preview ─────────────────────────────────────────────────────────────
function VideoPreview({ url }) {
  if (!url) return null;

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="w-full h-full"
          allowFullScreen
          title="Product Video"
        />
      </div>
    );
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          className="w-full h-full"
          allowFullScreen
          title="Product Video"
        />
      </div>
    );
  }

  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || url.includes('blob:')) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black">
        <video src={url} controls className="w-full h-full" />
      </div>
    );
  }

  return (
    <p className="text-xs text-orange-500 mt-1">
      ⚠ Could not preview this URL. It will still be saved.
    </p>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const queryClient = useQueryClient();

  // FIX: Only invalidate (refetch), never removeQueries — removeQueries caused race condition
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-admin'] });
  };

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    }).catch(() => { });
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products-admin'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
    enabled: isAdmin,
    staleTime: 0,
  });

  const products = allProducts.filter(p => !p.deleted);
  const trashedProducts = allProducts.filter(p => p.deleted);
  const displayed = activeTab === 'active' ? products : trashedProducts;

  // ── Save / Update mutation ────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const finalBrand =
        data.brand === 'Other' && data.customBrand?.trim()
          ? data.customBrand.trim()
          : data.brand === 'Other'
            ? ''
            : data.brand;

      const { main_group, customBrand, ...rest } = data;

      // FIX: Save description as-is (HTML from editor) — sanitize only at display time
      // Do NOT double-sanitize here; it corrupts the stored HTML
      const payload = {
        ...rest,
        brand: finalBrand,
        description: data.description || '',
        price: parseFloat(data.price) || 0,
        original_price:
          data.original_price !== '' && data.original_price != null
            ? parseFloat(data.original_price)
            : undefined,
        stock:
          data.stock !== '' && data.stock != null
            ? parseInt(data.stock, 10)
            : undefined,
        rating:
          data.rating !== '' && data.rating != null
            ? parseFloat(data.rating)
            : undefined,
        reviews_count:
          data.reviews_count !== '' && data.reviews_count != null
            ? parseInt(data.reviews_count, 10)
            : undefined,
        featured: Boolean(data.featured),
        flash_sale: Boolean(data.flash_sale),
        donkomi: Boolean(data.donkomi),
        review_enabled: data.review_enabled !== false,
        hidden: Boolean(data.hidden),
        deleted: Boolean(data.deleted),
      };

      if (editingProduct) {
        return base44.entities.Product.update(editingProduct.id, payload);
      }
      return base44.entities.Product.create(payload);
    },
    onSuccess: () => {
      invalidate();
      toast.success(editingProduct ? 'Product updated!' : 'Product created!');
      setShowForm(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}`);
      console.error('Save error:', err);
    },
  });

  // ── CRUD helpers (ALL FIXED) ──────────────────────────────────────────────

  // FIX: Use async/await properly, invalidate AFTER await resolves
  const softDelete = async (id) => {
    try {
      await base44.entities.Product.update(id, { deleted: true, hidden: true });
      await invalidate();
      toast.success('Product moved to Trash');
    } catch (err) {
      toast.error(`Failed to move to trash: ${err?.message || 'Unknown error'}`);
      console.error('Soft delete error:', err);
    }
  };

  const restore = async (id) => {
    try {
      await base44.entities.Product.update(id, { deleted: false, hidden: false });
      await invalidate();
      toast.success('Product restored');
    } catch (err) {
      toast.error(`Failed to restore: ${err?.message || 'Unknown error'}`);
      console.error('Restore error:', err);
    }
  };

  const permanentDelete = async (id) => {
    if (!window.confirm('Permanently delete? This cannot be undone.')) return;
    try {
      await base44.entities.Product.delete(id);
      await invalidate();
      toast.success('Permanently deleted');
    } catch (err) {
      toast.error(`Failed to delete: ${err?.message || 'Unknown error'}`);
      console.error('Permanent delete error:', err);
    }
  };

  // FIX: Eye icon logic corrected — hidden:true means invisible to users
  // Clicking when hidden=true → unhide (set hidden:false, show Eye icon = "currently visible")
  // Clicking when hidden=false → hide (set hidden:true, show EyeOff icon = "currently hidden")
  const toggleVisibility = async (product) => {
    try {
      const next = !product.hidden;
      await base44.entities.Product.update(product.id, { hidden: next });
      await invalidate();
      toast.success(next ? 'Product hidden from users' : 'Product now visible to users');
    } catch (err) {
      toast.error(`Failed to toggle visibility: ${err?.message || 'Unknown error'}`);
      console.error('Toggle visibility error:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Move ${selectedIds.length} product(s) to trash?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map(id =>
        base44.entities.Product.update(id, { deleted: true, hidden: true })
      ));
      await invalidate();
      setSelectedIds([]);
      toast.success(`${selectedIds.length} product(s) moved to trash`);
    } catch (err) {
      toast.error(`Bulk delete failed: ${err?.message || 'Unknown error'}`);
      console.error('Bulk delete error:', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkRestore = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map(id =>
        base44.entities.Product.update(id, { deleted: false, hidden: false })
      ));
      await invalidate();
      setSelectedIds([]);
      toast.success(`${selectedIds.length} product(s) restored`);
    } catch (err) {
      toast.error(`Bulk restore failed: ${err?.message || 'Unknown error'}`);
      console.error('Bulk restore error:', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  // ── Upload handlers ───────────────────────────────────────────────────────
  const handleUploadMain = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await uploadFile(file);
      setForm(f => ({ ...f, image_url: url }));
      toast.success('Main image uploaded!');
    } catch (err) {
      toast.error('Image upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploadingMain(false);
      e.target.value = '';
    }
  };

  const handleUploadExtra = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingExtra(true);
    try {
      const urls = await Promise.all(files.map(f => uploadFile(f)));
      setForm(f => ({ ...f, image_urls: [...(f.image_urls || []), ...urls].slice(0, 5) }));
      toast.success(`${urls.length} image(s) uploaded!`);
    } catch (err) {
      toast.error('Extra image upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploadingExtra(false);
      e.target.value = '';
    }
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const url = await uploadFile(file);
      setForm(f => ({ ...f, video_url: url }));
      toast.success('Video uploaded!');
    } catch (err) {
      toast.error('Video upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
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
    const isKnownBrand = knownBrands.includes(savedBrand);

    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      original_price: product.original_price ?? '',
      main_group,
      category: cat,
      brand: isKnownBrand ? savedBrand : (savedBrand ? 'Other' : ''),
      customBrand: isKnownBrand ? '' : savedBrand,
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
      deleted: product.deleted || false,
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

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === displayed.length ? [] : displayed.map(p => p.id));

  // FIX: Tag toggle — enforce mutual exclusivity for donkomi, flash_sale, featured
  // A product tagged donkomi-only should NOT appear in flash_sale or featured sections.
  // When toggling a tag on a card, explicitly set the others to false if needed.
  const handleTagToggle = async (product, key) => {
    try {
      const newValue = !product[key];
      const update = { [key]: newValue };

      // If turning ON donkomi → turn off flash_sale and featured
      if (key === 'donkomi' && newValue) {
        update.flash_sale = false;
        update.featured = false;
      }
      // If turning ON flash_sale → turn off donkomi
      if (key === 'flash_sale' && newValue) {
        update.donkomi = false;
      }
      // If turning ON featured → turn off donkomi
      if (key === 'featured' && newValue) {
        update.donkomi = false;
      }

      await base44.entities.Product.update(product.id, update);
      await invalidate();
      const label = key === 'flash_sale' ? 'Flash Sale' : key === 'featured' ? 'Featured' : 'Donkomi';
      toast.success(`${label} ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(`Failed to toggle tag`);
      console.error('Toggle error:', err);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!user) return (
    <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>
  );
  if (!isAdmin) return (
    <div className="p-8 text-center text-gray-500">Admin access required.</div>
  );

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

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setActiveTab('active'); setSelectedIds([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Active ({products.length})
        </button>
        <button
          onClick={() => { setActiveTab('trash'); setSelectedIds([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'trash' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Trash2 className="h-3.5 w-3.5" /> Trash ({trashedProducts.length})
        </button>
      </div>

      {/* Bulk actions bar */}
      {displayed.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={selectedIds.length === displayed.length && displayed.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4"
            />
            {selectedIds.length === displayed.length ? 'Deselect All' : 'Select All'}
          </label>
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
              {activeTab === 'active' ? (
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-1.5">
                  {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Move to Trash
                </Button>
              ) : (
                <Button size="sm" onClick={handleBulkRestore} disabled={bulkDeleting}
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                  {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Restore Selected
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <Card className="p-5 mb-8 border-2 border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-gray-800">
              {editingProduct ? 'Edit Product' : 'New Product'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingProduct(null); setForm(EMPTY_FORM); }}>
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">

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
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, j) => j !== i) }))}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(form.image_urls || []).length < 5 && (
                  <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-blue-400 transition-colors gap-0.5">
                    {uploadingExtra
                      ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      : <><Plus className="h-4 w-4 text-gray-400" /><span className="text-[9px] text-gray-400">Image</span></>}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadExtra} disabled={uploadingExtra} />
                  </label>
                )}
                <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-purple-300 flex flex-col items-center justify-center hover:border-purple-500 transition-colors gap-0.5 relative">
                  {uploadingVideo
                    ? <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                    : form.video_url
                      ? <>
                        <Video className="h-5 w-5 text-purple-500" />
                        <span className="text-[9px] text-purple-600 font-semibold">Replace</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setForm(f => ({ ...f, video_url: '' })); }}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                      : <>
                        <Video className="h-4 w-4 text-purple-400" />
                        <span className="text-[9px] text-purple-400">Video</span>
                      </>}
                  <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
                </label>
              </div>
              {form.video_url && !uploadingVideo && (
                <p className="text-xs text-purple-600 font-medium mt-1">✓ Video uploaded</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                Slots: {(form.image_urls || []).length}/5 images · {form.video_url ? '1/1' : '0/1'} video
              </p>
            </div>

            {/* Product Name */}
            <div className="md:col-span-2">
              <Label>Product Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. P9 Wireless Bluetooth Headset"
              />
            </div>

            {/* Step 1 — Main Category */}
            <div>
              <Label>Step 1 — Main Category *</Label>
              <Select
                value={form.main_group}
                onValueChange={v => setForm(f => ({ ...f, main_group: v, category: '', brand: '', customBrand: '', subcategory: '' }))}
              >
                <SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger>
                <SelectContent>
                  {MAIN_CATEGORY_GROUPS.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2 — Subcategory */}
            <div>
              <Label>Step 2 — Subcategory *</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm(f => ({ ...f, category: v, brand: '', customBrand: '', subcategory: '' }))}
                disabled={!form.main_group}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.main_group ? 'Select subcategory' : 'Select main category first'} />
                </SelectTrigger>
                <SelectContent>
                  {(GROUP_CATEGORIES[form.main_group] || []).map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3 — Brand */}
            <div>
              <Label>Step 3 — Brand *</Label>
              <Select
                value={form.brand}
                onValueChange={v => setForm(f => ({ ...f, brand: v, customBrand: '', subcategory: '' }))}
                disabled={!form.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.category ? 'Select brand' : 'Select subcategory first'} />
                </SelectTrigger>
                <SelectContent>
                  {(GROUP_BRANDS[form.main_group] || []).map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.brand === 'Other' && (
                <div className="mt-2">
                  <Input
                    value={form.customBrand || ''}
                    onChange={e => setForm(f => ({ ...f, customBrand: e.target.value }))}
                    placeholder="Type brand name e.g. Anker, Baseus, Xiaomi…"
                    className="border-orange-300 focus:ring-orange-400"
                  />
                  <p className="text-xs text-orange-500 mt-0.5">Enter the brand name manually</p>
                </div>
              )}
            </div>

            {/* Step 4 — Product Type */}
            <div>
              <Label>Step 4 — Product Type</Label>
              <Select
                value={form.subcategory}
                onValueChange={v => setForm(f => ({ ...f, subcategory: v }))}
                disabled={!form.brand}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.brand ? 'Select product type' : 'Select brand first'} />
                </SelectTrigger>
                <SelectContent>
                  {(
                    (BRAND_SUBCATEGORIES[form.category] || {})[
                      form.brand === 'Other' ? form.customBrand : form.brand
                    ] || []
                  ).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            <div>
              <Label>Price (₵) *</Label>
              <Input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Original Price */}
            <div>
              <Label>Original Price (₵) — for discount display</Label>
              <Input
                type="number"
                value={form.original_price}
                onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Stock */}
            <div>
              <Label>Stock Quantity <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <Input
                type="number"
                value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                placeholder="Leave blank if unlimited"
              />
            </div>

            {/* Video URL */}
            <div className="md:col-span-2">
              <Label>
                Video URL{' '}
                <span className="text-gray-400 font-normal text-xs">(YouTube, Vimeo, or direct link)</span>
              </Label>
              <Input
                value={form.video_url || ''}
                onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=... or https://..."
              />
              <VideoPreview url={form.video_url} />
            </div>

            {/* Description — Rich Text Editor */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">
                  Description
                  <span className="text-xs font-normal text-gray-400 ml-2">
                    Use the toolbar to format — bold, lists, alignment supported
                  </span>
                </Label>
              </div>
              <RichTextEditor
                value={form.description}
                onChange={v => setForm(f => ({ ...f, description: v }))}
              />
              {form.description && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer select-none">
                    👁 Preview rendered description
                  </summary>
                  <div
                    className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.description) }}
                  />
                </details>
              )}
            </div>

            {/* Tags / Flags — FIX: donkomi is mutually exclusive with flash_sale/featured */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-1">Product Tags</Label>
              <p className="text-xs text-amber-600 mb-2">
                ⚠ Note: <strong>Donkomi</strong> is separate from Flash Sale &amp; Featured. Enabling Donkomi will auto-disable the others.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'featured', label: '⭐ Featured' },
                  { key: 'flash_sale', label: '⚡ Flash Sale (CLASSICO Deals)' },
                  { key: 'donkomi', label: '🔥 Donkomi' },
                  { key: 'review_enabled', label: '💬 Reviews Enabled' },
                  { key: 'hidden', label: '🙈 Hidden from Users' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form[key] ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                      onClick={() => {
                        setForm(f => {
                          const newVal = !f[key];
                          const updates = { [key]: newVal };
                          // Enforce mutual exclusivity in the form
                          if (key === 'donkomi' && newVal) {
                            updates.flash_sale = false;
                            updates.featured = false;
                          }
                          if (key === 'flash_sale' && newVal) {
                            updates.donkomi = false;
                          }
                          if (key === 'featured' && newVal) {
                            updates.donkomi = false;
                          }
                          return { ...f, ...updates };
                        });
                      }}
                    >
                      {form[key] && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              {form.flash_sale && (
                <div className="mt-3">
                  <Label>Flash Sale End Date/Time (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.flash_sale_end || ''}
                    onChange={e => setForm(f => ({ ...f, flash_sale_end: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name || !form.price || !form.category}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {saveMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Check className="h-4 w-4" />}
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setEditingProduct(null); setForm(EMPTY_FORM); }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── PRODUCTS GRID ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {activeTab === 'active'
            ? <p>No products yet. Click "Add Product" to get started.</p>
            : <p>Trash is empty.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {displayed.map(product => {
            const isSelected = selectedIds.includes(product.id);
            const activeTags = [
              product.featured && { key: 'featured', label: 'Featured', color: 'bg-purple-500' },
              product.flash_sale && { key: 'flash_sale', label: 'Flash', color: 'bg-orange-500' },
              product.donkomi && { key: 'donkomi', label: 'Donkomi', color: 'bg-green-500' },
              product.hidden && { key: 'hidden', label: 'Hidden', color: 'bg-gray-500' },
            ].filter(Boolean);

            return (
              <Card
                key={product.id}
                className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''} ${product.hidden ? 'opacity-60' : ''}`}
              >
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>}
                  {product.hidden && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <EyeOff className="h-6 w-6 text-white opacity-80" />
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 cursor-pointer accent-blue-600"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  {activeTags.length > 0 && (
                    <div className="absolute top-1 left-1 flex flex-col gap-1">
                      {activeTags.map(tag => (
                        <Badge key={tag.key} className={`text-[9px] px-1 py-0 ${tag.color} text-white`}>
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">
                    {product.name}
                  </p>
                  <p className="text-sm font-black text-gray-900">₵{product.price?.toLocaleString()}</p>
                  {product.stock != null && (
                    <p className="text-[10px] text-gray-400">Stock: {product.stock}</p>
                  )}

                  {/* FIX: Render description as HTML, not raw text */}
                  {product.description && (
                    <div
                      className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-tight"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                    />
                  )}

                  {activeTab === 'active' && (
                    <>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {[
                          { key: 'featured', label: '⭐', title: 'Featured' },
                          { key: 'flash_sale', label: '⚡', title: 'Flash Sale' },
                          { key: 'donkomi', label: '🔥', title: 'Donkomi' },
                        ].map(({ key, label, title }) => (
                          <button
                            key={key}
                            title={`Toggle ${title}`}
                            onClick={() => handleTagToggle(product, key)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold transition-colors ${product[key] ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-400'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-1 mt-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs gap-1"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>

                        {/* FIX: Eye icon — shows correct state and works properly */}
                        {/* hidden=false → product IS visible → show EyeOff to offer hiding it */}
                        {/* hidden=true  → product IS hidden → show Eye to offer showing it */}
                        <button
                          title={product.hidden ? 'Click to show to users' : 'Click to hide from users'}
                          onClick={() => toggleVisibility(product)}
                          className={`h-7 w-7 flex items-center justify-center rounded-md border text-xs transition-colors ${
                            product.hidden
                              ? 'bg-yellow-50 border-yellow-300 text-yellow-600 hover:bg-yellow-100'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {product.hidden
                            ? <Eye className="h-3.5 w-3.5" />
                            : <EyeOff className="h-3.5 w-3.5" />
                          }
                        </button>

                        <button
                          title="Move to Trash"
                          onClick={() => softDelete(product.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-md border bg-red-50 border-red-200 text-red-500 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}

                  {activeTab === 'trash' && (
                    <div className="flex gap-1 mt-1.5">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => restore(product.id)}
                      >
                        <RotateCcw className="h-3 w-3" /> Restore
                      </Button>
                      <button
                        title="Delete permanently"
                        onClick={() => permanentDelete(product.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-md border bg-red-50 border-red-200 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}