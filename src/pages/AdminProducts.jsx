import React, { useMemo, useState } from 'react';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, Pencil, Plus, ImagePlus, Loader2, Check, Video, Eye, EyeOff, Link2, FileSpreadsheet, Trash2, Sparkles } from 'lucide-react';
import ReactQuill from 'react-quill';
import { toast } from 'sonner';
import ProductImportCenter from '@/components/admin/ProductImportCenter.jsx';
import {
  CATEGORY_SUBCATEGORIES,
  GROUP_BRANDS,
  GROUP_CATEGORIES,
  HOME_SECTIONS,
  MAIN_CATEGORY_GROUPS,
  PRESET_COLORS,
  buildEmptyProductForm,
  hydrateProductForm,
  deriveMainGroupFromCategory,
  normalizeProductMedia,
  normalizeStringArray,
  saveProduct,
  splitUrlList
} from '@/services/products/productWriteService.js';

import {
  generateSEO
} from '@/services/product-engine/seoGenerator.js';


import {
  generateDescription
} from '@/services/product-engine/descriptionGenerator.js';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean']
  ]
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const PRESET_WATTAGES = ['5W', '10W', '18W', '20W', '25W', '33W', '45W', '65W', '100W', '120W', '150W'];
const PRESET_TYPES = ['USB-C', 'Lightning', 'Micro USB', 'Type-A', 'Wireless', 'Original', 'Compatible', 'Standard', 'Pro', 'Plus', 'Max'];

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function mergeImageUrls(currentUrls = [], nextUrls = []) {
  return [...new Set([...(Array.isArray(currentUrls) ? currentUrls : []), ...(Array.isArray(nextUrls) ? nextUrls : [])]
    .map((item) => String(item || '').trim())
    .filter(Boolean))];
}

function getProductPreviewImage(form = {}) {
  return form.image_url || form.image_urls?.[0] || '';
}

async function askGemini(prompt, systemContext) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Understood. I will return clean product copy.' }] },
        { role: 'user', parts: [{ text: prompt }] },
      ],
    }),
  });

  const data = await response.json();
  if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error(data?.error?.message || 'No response from AI service.');
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function normalizeLooseKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSourceValue(source = {}, candidates = []) {
  const entries = Object.entries(source || {});
  for (const candidate of candidates) {
    if (candidate in source && source[candidate] !== '') return source[candidate];
  }

  const normalizedCandidates = candidates.map((candidate) => normalizeLooseKey(candidate)).filter(Boolean);
  const matchedEntry = entries.find(([key, value]) => normalizedCandidates.includes(normalizeLooseKey(key)) && value !== '');
  return matchedEntry?.[1];
}

function parsePresetOptions(rawValue, presets = []) {
  if (Array.isArray(rawValue)) return rawValue.filter(Boolean);
  const raw = String(rawValue || '').trim();
  if (!raw) return [];

  const delimited = normalizeStringArray(raw);
  if (delimited.length > 1) return delimited;

  const compact = raw.replace(/\s+/g, '').toLowerCase();
  const matches = presets.filter((preset) => compact.includes(String(preset).replace(/\s+/g, '').toLowerCase()));
  return matches.length > 0 ? matches : delimited;
}

function resolveImportedMainGroup(value, categoryValue = '') {
  const raw = String(value || '').trim();
  if (!raw) return deriveMainGroupFromCategory(categoryValue) || '';

  const normalized = normalizeLooseKey(raw);
  const matched = MAIN_CATEGORY_GROUPS.find((group) => normalizeLooseKey(group.id) === normalized || normalizeLooseKey(group.label) === normalized);
  return matched?.id || deriveMainGroupFromCategory(categoryValue) || raw;
}

function resolveImportedCategory(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = normalizeLooseKey(raw);
  const matched = Object.values(GROUP_CATEGORIES)
    .flat()
    .find((category) => normalizeLooseKey(category.value) === normalized || normalizeLooseKey(category.label) === normalized);
  return matched?.value || raw;
}

function buildImportedEditorPayload(row = {}) {
  const source = row?.original ? { ...row.original, ...row } : row;
  const rawExtraImages = firstDefined(
    source.image_urls,
    getSourceValue(source, ['Extra Product Images URL', 'Extra Image URLs']),
    source['Extra Image 1'],
  );
  const inferredExtraImages = normalizeStringArray(rawExtraImages).length
    ? normalizeStringArray(rawExtraImages)
    : [source['Extra Image 1'], source['Extra Image 2'], source['Extra Image 3'], source['Extra Image 4']].filter(Boolean);
  const media = normalizeProductMedia(
    firstDefined(source.image_url, getSourceValue(source, ['Main Product Image URL', 'Main Image', 'Image URL'])) || '',
    inferredExtraImages,
  );
  const home_sections = Array.isArray(source.home_sections)
    ? source.home_sections
    : normalizeStringArray(firstDefined(getSourceValue(source, ['Homepage Sections']), source.home_sections) || '');

  const colorOptions = Array.isArray(source.available_colors)
    ? source.available_colors
    : parsePresetOptions(firstDefined(source.colors, source.Colors, getSourceValue(source, ['Show Color Options to Customers'])), PRESET_COLORS);
  const wattageOptions = Array.isArray(source.available_wattage)
    ? source.available_wattage
    : parsePresetOptions(firstDefined(source.available_wattage, getSourceValue(source, ['Show Wattage Options to Customers'])), PRESET_WATTAGES);
  const typeOptions = Array.isArray(source.available_types)
    ? source.available_types
    : parsePresetOptions(firstDefined(source.variants, source.Variants, getSourceValue(source, ['Show Type/Variant Options to Customers'])), PRESET_TYPES);

  const categoryValue = firstDefined(source.category, source.categoryLabel, getSourceValue(source, ['Category'])) || '';
  const resolvedCategory = resolveImportedCategory(categoryValue);

  const details = {
    name: firstDefined(source.name, getSourceValue(source, ['Product Name', 'Name', 'Product'])) || '',
    price: firstDefined(source.price, source.Price) ?? '',
    original_price: firstDefined(source.original_price, getSourceValue(source, ['Original Price'])) ?? '',
    main_group: resolveImportedMainGroup(firstDefined(source.main_group, getSourceValue(source, ['Main Group'])), resolvedCategory),
    category: resolvedCategory,
    brand: firstDefined(source.brand, getSourceValue(source, ['Brand'])) || '',
    subcategory: firstDefined(source.subcategory, getSourceValue(source, ['Product Type / Subcategory', 'Product Type', 'Subcategory'])) || '',
    stock: firstDefined(source.stock, source.Stock) ?? '',
    description: firstDefined(source.description, getSourceValue(source, ['Description (Rich Text)', 'Description'])) || '',
    image_url: media.image_url,
    image_urls: media.image_urls,
    video_url: firstDefined(source.video_url, getSourceValue(source, ['Product Video URL (optional)', 'Video URL'])) || '',
    sku: firstDefined(source.sku, source.SKU) || '',
    barcode: firstDefined(source.barcode, source.Barcode) || '',
    warranty: firstDefined(source.warranty, source.Warranty) || '',
    voltage: firstDefined(source.voltage, source.Voltage) || '',
    power: firstDefined(source.power, source.Power) || '',
    capacity: firstDefined(source.capacity, source.Capacity) || '',
    ram: firstDefined(source.ram, source.RAM) || '',
    storage: firstDefined(source.storage, source.Storage) || '',
    screen_size: firstDefined(source.screen_size, getSourceValue(source, ['Screen Size'])) || '',
    features: firstDefined(source.features, source.Features) || '',
    flash_sale_end: firstDefined(source.flash_sale_end, getSourceValue(source, ['Flash Sale End Date'])) || '',
    is_visible: source.is_visible !== false,
    review_enabled: source.review_enabled !== false,
    show_colors: source.show_colors || colorOptions.length > 0,
    available_colors: colorOptions,
    show_wattage: source.show_wattage || wattageOptions.length > 0,
    available_wattage: wattageOptions,
    show_type: source.show_type || typeOptions.length > 0,
    available_types: typeOptions,
    tags: Array.isArray(source.tags) ? source.tags : normalizeStringArray(firstDefined(source.tags, source.Tags) || ''),
    keywords: Array.isArray(source.keywords) ? source.keywords : normalizeStringArray(firstDefined(source.keywords, source.Keywords) || ''),
    seo_title: source.seo_title || '',
    seo_description: source.seo_description || '',
    slug: source.slug || '',
    home_sections,
  };

  const hydrated = hydrateProductForm({
    ...details,
    ...Object.fromEntries(HOME_SECTIONS.map(({ key }) => [key, home_sections.includes(key)])),
  });

  return {
    ...hydrated,
    ...details,
    main_group: details.main_group || hydrated.main_group || deriveMainGroupFromCategory(details.category),
    description: details.description || generateDescription(details),
  };
}

export default function AdminProducts() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [showForm, setShowForm] = useState(false);
const [showImportCenter, setShowImportCenter] = useState(false);
const [importMode, setImportMode] = useState(false);
const [generatingDescription, setGeneratingDescription] = useState(false);

const [editingProduct, setEditingProduct] = useState(null);

const [form, setForm] = useState(buildEmptyProductForm());
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [extraImageUrlInput, setExtraImageUrlInput] = useState('');
  const queryClient = useQueryClient();
const handleImportedProduct = (excelRow) => {
  const mappedProduct = buildImportedEditorPayload(excelRow);
  const seo = generateSEO(mappedProduct);

  setImportMode(true);
  setEditingProduct(null);
  setExtraImageUrlInput('');
  setShowImportCenter(false);
  setShowForm(true);
  setForm({
    ...mappedProduct,
    seo_title: mappedProduct.seo_title || seo.title,
    seo_description: mappedProduct.seo_description || seo.description,
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast.success('Spreadsheet row loaded into the editor. Review the preview, adjust anything you want, then create the product.');
};

const handleGenerateDescription = async () => {
  if (!String(form.name || '').trim()) {
    toast.error('Enter the product name first.');
    return;
  }

  const fallbackDescription = generateDescription(form);
  setGeneratingDescription(true);

  try {
    if (!GEMINI_API_KEY) {
      setForm((current) => ({ ...current, description: fallbackDescription }));
      toast.success('Description generated from the product details.');
      return;
    }

    const systemContext = 'You are a product copywriter for FMM CLASSICO in Ghana. Return clean HTML using only h2, h3, p, ul, and li tags. Focus on benefits, trust, and clear specifications. Do not wrap the response in markdown fences.';
    const prompt = [
      `Product name: ${form.name || ''}`,
      `Brand: ${form.brand === 'Other (type below)' ? form.custom_brand : form.brand || ''}`,
      `Category: ${form.category || ''}`,
      `Subcategory: ${form.subcategory === '__custom__' ? form.custom_subcategory : form.subcategory || ''}`,
      `Price: ${form.price || ''}`,
      `Features: ${Array.isArray(form.available_types) ? form.available_types.join(', ') : ''}`,
      `Colours: ${Array.isArray(form.available_colors) ? form.available_colors.join(', ') : ''}`,
      `Specs: storage=${form.storage || ''}, ram=${form.ram || ''}, capacity=${form.capacity || ''}, power=${form.power || ''}, voltage=${form.voltage || ''}, warranty=${form.warranty || ''}`,
    ].join('\n');

    const aiDescription = await askGemini(prompt, systemContext);
    setForm((current) => ({ ...current, description: aiDescription || fallbackDescription }));
    toast.success('Description generated and inserted into the editor.');
  } catch (error) {
    setForm((current) => ({ ...current, description: fallbackDescription }));
    toast.error(`AI description failed, so a local description template was added instead. ${error.message || ''}`.trim());
  } finally {
    setGeneratingDescription(false);
  }
};
  React.useEffect(() => {
    let active = true;

    appClient.auth.me()
      .then((authUser) => {
        if (!active) return;
        const hasAdminAccess = authUser?.role === 'admin';
        setUser(authUser);
        setIsAdmin(hasAdminAccess);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setIsAdmin(false);
      })
      .finally(() => {
        if (active) {
          setAuthChecked(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const { data: productsResponse = [], isLoading } = useQuery({
    queryKey: ['products-admin'],
    queryFn: async () => ensureArray(await appClient.entities.Product.list('-created_date', 200)),
    enabled: isAdmin,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
  });

  const displayProducts = useMemo(() => (
    productsResponse.map((product) => {
      const normalizedImages = normalizeProductMedia(product.image_url, normalizeStringArray(product.image_urls));
      return {
        ...product,
        ...normalizedImages,
      };
    })
  ), [productsResponse]);

  const saveMutation = useMutation({
    mutationFn: (data) => saveProduct({ formData: data, productId: editingProduct?.id || null }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['products'] });
      queryClient.removeQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      toast.success(editingProduct ? 'Product updated!' : 'Product created!');
      setShowForm(false);
      setImportMode(false);
      setEditingProduct(null);
      setForm(buildEmptyProductForm());
      setExtraImageUrlInput('');
    },
    onError: (error) => {
      console.error('Save product error:', error);
      toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
    }
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, is_visible }) => appClient.entities.Product.update(id, { is_visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const deleteMutation = useMutation({

  mutationFn: (id) =>
    appClient.entities.Product.delete(id),

  onSuccess: () => {

    queryClient.invalidateQueries({
      queryKey: ['products-admin']
    });

    queryClient.invalidateQueries({
      queryKey: ['products']
    });


    toast.success("Product deleted successfully");

  },


  onError: (error)=>{

    console.error(
      "Delete product error:",
      error
    );


    toast.error(
      error.message ||
      "Failed to delete product"
    );

  }

});

  const handleUploadMain = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      setForm((current) => ({
        ...current,
        ...normalizeProductMedia(file_url, current.image_urls),
      }));
      toast.success('Main image uploaded!');
    } catch (error) {
      toast.error(error?.message || 'Main image upload failed.');
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
      const urls = await Promise.all(files.map((file) => appClient.integrations.Core.UploadFile({ file }).then((result) => result.file_url)));
      setForm((current) => ({
        ...current,
        image_urls: mergeImageUrls(current.image_urls, urls),
      }));
      toast.success(`${urls.length} image(s) uploaded!`);
    } catch (error) {
      toast.error(error?.message || 'Extra image upload failed.');
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
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      setForm((current) => ({ ...current, video_url: file_url }));
      toast.success('Video uploaded!');
    } catch (error) {
      toast.error(error?.message || 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrls = () => {
    const urls = splitUrlList(extraImageUrlInput);
    if (urls.length === 0) {
      toast.error('Paste at least one valid image URL.');
      return;
    }

    setForm((current) => ({
      ...current,
      image_urls: mergeImageUrls(current.image_urls, urls),
    }));
    setExtraImageUrlInput('');
    toast.success(`${urls.length} image URL${urls.length > 1 ? 's' : ''} added.`);
  };

  const handleEdit = (product) => {
    setImportMode(false);
    setEditingProduct(product);
    setForm(hydrateProductForm(product));
    setExtraImageUrlInput('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNew = () => {
    setImportMode(false);

setEditingProduct(null);

setForm(buildEmptyProductForm());
    setExtraImageUrlInput('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const availableCategories = useMemo(() => {
    if (form.main_group) return GROUP_CATEGORIES[form.main_group] || [];
    return Object.values(GROUP_CATEGORIES).flat();
  }, [form.main_group]);
  const availableBrands = useMemo(() => {
    if (form.main_group) return GROUP_BRANDS[form.main_group] || [];

    const inferredGroup = deriveMainGroupFromCategory(form.category);
    if (inferredGroup) return GROUP_BRANDS[inferredGroup] || [];

    return [...new Set(Object.values(GROUP_BRANDS).flat())];
  }, [form.main_group, form.category]);
  const availableSubcategories = useMemo(() => {
    if (form.category) return CATEGORY_SUBCATEGORIES[form.category] || [];
    return [...new Set(Object.values(CATEGORY_SUBCATEGORIES).flat())];
  }, [form.category]);

  if (!authChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <div className="p-8 text-center text-gray-500">Admin access required.</div>;
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <ProductImportCenter

open={showImportCenter}

onOpenChange={setShowImportCenter}

onProductMapped={handleImportedProduct}

/>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Products</h1>
          <p className="text-sm text-gray-500">Create products manually or open the new bulk import workflow without replacing the existing editor.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setShowImportCenter(true)} className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
            <FileSpreadsheet className="h-4 w-4" /> Bulk Import Products
          </Button>
          <Button onClick={handleNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-5 mb-8 border-2 border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-gray-800">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
            <button onClick={() => { setShowForm(false); setImportMode(false); setEditingProduct(null); setForm(buildEmptyProductForm()); setExtraImageUrlInput(''); }}><X className="h-5 w-5 text-gray-400" /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Main Product Image</Label>
              <div className="flex items-start gap-4">
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                  {getProductPreviewImage(form)
                    ? <img src={getProductPreviewImage(form)} alt="" className="w-full h-full object-cover" />
                    : <ImagePlus className="h-8 w-8 text-gray-300" />}
                </div>
                <div className="flex-1 space-y-3">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors w-fit">
                      {uploadingMain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingMain ? 'Uploading...' : form.image_url ? 'Replace Image' : 'Upload Main Image'}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadMain} disabled={uploadingMain} />
                  </label>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Or paste main image URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.image_url}
                        onChange={(e) => setForm((current) => ({
                          ...current,
                          ...normalizeProductMedia(e.target.value, current.image_urls),
                        }))}
                        placeholder="https://...main-product-image.jpg"
                      />
                      {form.image_url && (
                        <Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, image_url: '' }))}>
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  {getProductPreviewImage(form) && <p className="text-xs text-green-600 font-medium">✓ Product image ready</p>}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Extra Product Images (upload as many as you want)</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(form.image_urls || []).map((url, index) => (
                  <div key={`${url}-${index}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, image_urls: current.image_urls.filter((_, itemIndex) => itemIndex !== index) }))}
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

              <div className="space-y-2">
                <Label className="text-xs text-gray-600 flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />Paste one or many extra image URLs</Label>
                <Textarea
                  value={extraImageUrlInput}
                  onChange={(e) => setExtraImageUrlInput(e.target.value)}
                  placeholder="Paste one URL per line, or separate them with commas"
                  rows={3}
                />
                <div className="flex flex-wrap gap-2 items-center">
                  <Button type="button" variant="outline" onClick={handleAddImageUrls}>Add URL Images</Button>
                  <p className="text-xs text-gray-400">If you leave the main image empty, the first URL added becomes the main product image automatically.</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Product Video (optional)</Label>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1.5">Paste a video link from YouTube, TikTok, Instagram, Facebook, Vimeo, Cloudinary, or a direct MP4/WebM file.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. https://www.youtube.com/watch?v=... or https://res.cloudinary.com/.../video/upload/..."
                    value={form.video_url || ''}
                    onChange={(e) => setForm((current) => ({ ...current, video_url: e.target.value }))}
                    className="text-sm"
                  />
                  {form.video_url && (
                    <button type="button" onClick={() => setForm((current) => ({ ...current, video_url: '' }))} className="text-red-400 hover:text-red-600 flex-shrink-0">
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
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-300 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors w-fit">
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                    {uploadingVideo ? 'Uploading video...' : 'Upload Video File'}
                  </div>
                  <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
                </label>
              </div>

              {form.video_url && (
                <p className="text-xs text-green-600 mt-2 font-medium">✓ Video ready: {form.video_url.length > 80 ? `${form.video_url.slice(0, 80)}...` : form.video_url}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="e.g. iPhone 14 Pro Max" />
            </div>

            {importMode && (
              <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                This product was auto-filled from the spreadsheet. You can change any field before you create it.
              </div>
            )}

            <div>
              <Label>
                Main Group *
                {importMode && <span className="ml-2 text-xs text-green-600">✓ Auto-filled from the spreadsheet</span>}
              </Label>
              <Select
                value={form.main_group || ""}
                onValueChange={(value) => setForm((current) => ({
                  ...current,
                  main_group: value,
                  category: "",
                  brand: "",
                  subcategory: "",
                  custom_brand: "",
                  custom_subcategory: "",
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select main group" />
                </SelectTrigger>
                <SelectContent>
                  {MAIN_CATEGORY_GROUPS.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                Category *
                {importMode && <span className="ml-2 text-xs text-green-600">✓ Auto-filled when possible</span>}
              </Label>
              <Select
                value={form.category || ""}
                onValueChange={(value) => setForm((current) => ({
                  ...current,
                  main_group: deriveMainGroupFromCategory(value) || current.main_group,
                  category: value,
                  brand: "",
                  subcategory: "",
                  custom_brand: "",
                  custom_subcategory: "",
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                Brand *
                {importMode && <span className="ml-2 text-xs text-green-600">✓ Auto-filled when possible</span>}
              </Label>
              <Select
                value={form.brand || ""}
                onValueChange={(value) => setForm((current) => ({
                  ...current,
                  brand: value,
                  custom_brand: value === 'Other (type below)' ? current.custom_brand : "",
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.brand === 'Other (type below)' && (
                <Input
                  className="mt-2"
                  placeholder="Type the brand name"
                  value={form.custom_brand || ""}
                  onChange={(e) => setForm((current) => ({ ...current, custom_brand: e.target.value }))}
                />
              )}
            </div>

            <div>
              <Label>
                Product Type / Subcategory *
                {importMode && <span className="ml-2 text-xs text-green-600">✓ Auto-filled when possible</span>}
              </Label>
              <Select
                value={form.subcategory || ""}
                onValueChange={(value) => setForm((current) => ({
                  ...current,
                  subcategory: value,
                  custom_subcategory: value === '__custom__' ? current.custom_subcategory : "",
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Other (type my own)</SelectItem>
                </SelectContent>
              </Select>
              {form.subcategory === "__custom__" && (
                <Input
                  className="mt-2"
                  placeholder="Type product type / subcategory"
                  value={form.custom_subcategory || ""}
                  onChange={(e) => setForm((current) => ({ ...current, custom_subcategory: e.target.value }))}
                />
              )}
            </div>

            <div>
              <Label>Price (₵) *</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Original Price (₵) — for discount display</Label>
              <Input type="number" value={form.original_price} onChange={(e) => setForm((current) => ({ ...current, original_price: e.target.value }))} placeholder="0.00" />
            </div>

            <div className="md:col-span-2">
              <Label>Stock Quantity</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm((current) => ({ ...current, stock: e.target.value }))} placeholder="Leave empty = unlimited / no stock tracking" className="mb-1" />
              <p className="text-xs text-gray-400">
                <strong>Empty</strong> = no stock tracking (always shown). <strong>0</strong> = out of stock (hidden from customers). <strong>1+</strong> = shown with that quantity available.
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label className="font-semibold block">Description (Rich Text)</Label>
                  <p className="text-xs text-gray-500">Use the toolbar to format text with bold, bullets, headings, font size, and more.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription || !String(form.name || '').trim()}
                  className="gap-2"
                >
                  {generatingDescription ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {GEMINI_API_KEY ? 'Generate with AI' : 'Generate description'}
                </Button>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden admin-quill">
                <ReactQuill
                  theme="snow"
                  value={form.description}
                  onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                  modules={QUILL_MODULES}
                  placeholder="Write a detailed, well-formatted product description..."
                />
              </div>
            </div>

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Live preview before create</h3>
                  <p className="text-xs text-slate-500">Review how the product information looks before saving it.</p>
                </div>
                <Badge variant="outline">Preview</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-xl border bg-white aspect-square">
                  {getProductPreviewImage(form) ? (
                    <img src={getProductPreviewImage(form)} alt={form.name || 'Product preview'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">No image selected</div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-semibold text-slate-900">{form.name || 'Product name preview'}</h4>
                    {!form.is_visible && <Badge className="bg-red-100 text-red-700">Hidden</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">
                    {[form.main_group, form.category, form.subcategory === '__custom__' ? form.custom_subcategory : form.subcategory].filter(Boolean).join(' • ') || 'Category details will appear here'}
                  </p>
                  <p className="text-sm text-slate-600">
                    Brand: {form.brand === 'Other (type below)' ? (form.custom_brand || 'Custom brand') : (form.brand || 'Not selected')}
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {form.price ? `₵${form.price}` : 'Set a price'}
                    {form.original_price ? <span className="ml-2 text-sm font-normal text-slate-500 line-through">₵{form.original_price}</span> : null}
                  </p>
                  <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                    <div dangerouslySetInnerHTML={{ __html: form.description || '<p>Description preview will appear here.</p>' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="font-semibold block mb-1">Homepage Sections</Label>
              <p className="text-xs text-gray-500 mb-3">Select which sections this product appears in.</p>
              <div className="flex flex-wrap gap-3">
                {HOME_SECTIONS.map(({ key, label }) => {
                  const checked = (form.home_sections || []).includes(key);
                  return (
                    <label key={key} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      onClick={() => setForm((current) => {
                        const sections = current.home_sections || [];
                        return { ...current, home_sections: checked ? sections.filter((section) => section !== key) : [...sections, key] };
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
                  <Input type="datetime-local" value={form.flash_sale_end || ''} onChange={(e) => setForm((current) => ({ ...current, flash_sale_end: e.target.value }))} />
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
              <Label className="font-semibold block">Customer Options (optional)</Label>
              <p className="text-xs text-gray-400 -mt-3">Enable any option to let customers choose before adding to cart. Leave off if not applicable.</p>

              <div className="border rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => setForm((current) => ({ ...current, show_colors: !current.show_colors }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.show_colors ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {form.show_colors && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-medium text-sm text-gray-700">Show Color Options to Customers</span>
                </label>
                {form.show_colors && (
                  <div className="pt-1 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((color) => (
                        <button key={color} type="button"
                          onClick={() => setForm((current) => ({
                            ...current,
                            available_colors: current.available_colors.includes(color)
                              ? current.available_colors.filter((item) => item !== color)
                              : [...current.available_colors, color]
                          }))}
                          className={`text-xs px-2 py-1 rounded-full border transition-all ${form.available_colors.includes(color) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                          {color}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={form.color_input || ''} onChange={(e) => setForm((current) => ({ ...current, color_input: e.target.value }))}
                        placeholder="Add custom color..." className="h-8 text-xs flex-1" />
                      <Button type="button" size="sm" className="h-8 text-xs" onClick={() => {
                        if (!form.color_input?.trim()) return;
                        setForm((current) => ({ ...current, available_colors: [...new Set([...current.available_colors, current.color_input.trim()])], color_input: '' }));
                      }}>Add</Button>
                    </div>
                    {form.available_colors.length > 0 && (
                      <p className="text-xs text-green-600">Selected: {form.available_colors.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => setForm((current) => ({ ...current, show_wattage: !current.show_wattage }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.show_wattage ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {form.show_wattage && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-medium text-sm text-gray-700">Show Wattage Options to Customers</span>
                </label>
                {form.show_wattage && (
                  <div className="pt-1 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_WATTAGES.map((wattage) => (
                        <button key={wattage} type="button"
                          onClick={() => setForm((current) => ({
                            ...current,
                            available_wattage: current.available_wattage.includes(wattage)
                              ? current.available_wattage.filter((item) => item !== wattage)
                              : [...current.available_wattage, wattage]
                          }))}
                          className={`text-xs px-2 py-1 rounded-full border transition-all ${form.available_wattage.includes(wattage) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                          {wattage}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={form.wattage_input || ''} onChange={(e) => setForm((current) => ({ ...current, wattage_input: e.target.value }))}
                        placeholder="Custom wattage e.g. 30W..." className="h-8 text-xs flex-1" />
                      <Button type="button" size="sm" className="h-8 text-xs" onClick={() => {
                        if (!form.wattage_input?.trim()) return;
                        setForm((current) => ({ ...current, available_wattage: [...new Set([...current.available_wattage, current.wattage_input.trim()])], wattage_input: '' }));
                      }}>Add</Button>
                    </div>
                    {form.available_wattage.length > 0 && (
                      <p className="text-xs text-green-600">Selected: {form.available_wattage.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => setForm((current) => ({ ...current, show_type: !current.show_type }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.show_type ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {form.show_type && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-medium text-sm text-gray-700">Show Type/Variant Options to Customers</span>
                </label>
                {form.show_type && (
                  <div className="pt-1 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_TYPES.map((type) => (
                        <button key={type} type="button"
                          onClick={() => setForm((current) => ({
                            ...current,
                            available_types: current.available_types.includes(type)
                              ? current.available_types.filter((item) => item !== type)
                              : [...current.available_types, type]
                          }))}
                          className={`text-xs px-2 py-1 rounded-full border transition-all ${form.available_types.includes(type) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={form.type_input || ''} onChange={(e) => setForm((current) => ({ ...current, type_input: e.target.value }))}
                        placeholder="Custom type e.g. 256GB..." className="h-8 text-xs flex-1" />
                      <Button type="button" size="sm" className="h-8 text-xs" onClick={() => {
                        if (!form.type_input?.trim()) return;
                        setForm((current) => ({ ...current, available_types: [...new Set([...current.available_types, current.type_input.trim()])], type_input: '' }));
                      }}>Add</Button>
                    </div>
                    {form.available_types.length > 0 && (
                      <p className="text-xs text-green-600">Selected: {form.available_types.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="font-semibold block mb-2">Other Settings</Label>
              <div className="flex flex-wrap gap-3">
                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${form.review_enabled ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setForm((current) => ({ ...current, review_enabled: !current.review_enabled }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.review_enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {form.review_enabled && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Reviews Enabled</span>
                </label>

                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${form.is_visible ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}
                  onClick={() => setForm((current) => ({ ...current, is_visible: !current.is_visible }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.is_visible ? 'bg-green-600 border-green-600' : 'border-red-400 bg-red-100'}`}>
                    {form.is_visible ? <Eye className="h-3 w-3 text-white" /> : <EyeOff className="h-3 w-3 text-red-500" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {form.is_visible ? 'Visible to Customers' : 'Hidden from Customers'}
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
            <Button variant="outline" onClick={() => { setShowForm(false); setImportMode(false); setEditingProduct(null); setForm(buildEmptyProductForm()); setExtraImageUrlInput(''); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, index) => <Skeleton key={index} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {displayProducts.map((product) => {
            const isHidden = product.is_visible === false;
            const isOutOfStock = product.stock != null && product.stock === 0;
            return (
              <Card key={product.id} className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isHidden ? 'opacity-60 border-dashed border-red-300' : ''}`}>
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>}
                  <div className="absolute top-1 left-1 flex flex-col gap-1">
                    {product.featured && <Badge className="text-[9px] px-1 py-0 bg-purple-500">Featured</Badge>}
                    {product.flash_sale && <Badge className="text-[9px] px-1 py-0 bg-orange-500">Flash</Badge>}
                    {product.donkomi && <Badge className="text-[9px] px-1 py-0 bg-green-500">Donkomi</Badge>}
                    {product.new_arrival && <Badge className="text-[9px] px-1 py-0 bg-yellow-500">New</Badge>}
                    {product.top_selling && <Badge className="text-[9px] px-1 py-0 bg-blue-500">Top</Badge>}
                  </div>
                  <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
                    {isHidden && <Badge className="text-[9px] px-1 py-0 bg-red-500">Hidden</Badge>}
                    {isOutOfStock && !isHidden && <Badge className="text-[9px] px-1 py-0 bg-gray-500">Out of Stock</Badge>}
                    {product.image_urls?.length > 0 && <Badge className="text-[9px] px-1 py-0 bg-slate-700">+{product.image_urls.length} images</Badge>}
                    {product.video_url && <Badge className="text-[9px] px-1 py-0 bg-indigo-600">Video</Badge>}
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
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 w-7 p-0 flex-shrink-0 ${isHidden ? 'text-red-500 border-red-300 hover:bg-red-50' : 'text-green-600 border-green-300 hover:bg-green-50'}`}
                      title={isHidden ? 'Hidden - click to show' : 'Visible - click to hide'}
                      onClick={() => toggleVisibilityMutation.mutate({ id: product.id, is_visible: !product.is_visible })}
                    >
                      {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => handleEdit(product)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
size="sm"
variant="outline"
className="h-7 w-7 p-0 text-red-600 border-red-300 hover:bg-red-50"
title="Delete product"
onClick={() => {
const confirmed =
window.confirm(
`Are you sure you want to permanently delete "${product.name}"?`
);


if(confirmed){

deleteMutation.mutate(product.id);

}

}}
>
<Trash2 className="h-3 w-3" />
</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {!isLoading && displayProducts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>No products yet. Click "Add Product" to get started.</p>
        </div>
      )}
    </div>
  );
}
