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
import { Upload, X, Pencil, Plus, ImagePlus, Loader2, Check, Video, Eye, EyeOff, Link2, FileSpreadsheet } from 'lucide-react';
import ReactQuill from 'react-quill';
import { toast } from 'sonner';
import ProductImportCenter from '@/components/admin/ProductImportCenter.jsx';
import { CATEGORY_SUBCATEGORIES, GROUP_BRANDS, GROUP_CATEGORIES, HOME_SECTIONS, MAIN_CATEGORY_GROUPS, PRESET_COLORS, buildEmptyProductForm, hydrateProductForm, normalizeProductMedia, normalizeStringArray, saveProduct, splitUrlList } from '@/services/products/productWriteService.js';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean']
  ]
};

export default function AdminProducts() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImportCenter, setShowImportCenter] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(buildEmptyProductForm());
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [extraImageUrlInput, setExtraImageUrlInput] = useState('');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    appClient.auth.me()
      .then((authUser) => {
        setUser(authUser);
        setIsAdmin(authUser?.role === 'admin');
      })
      .catch(() => {
        setUser(null);
        setIsAdmin(false);
      });
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-admin'],
    queryFn: () => appClient.entities.Product.list('-created_date', 200),
    enabled: isAdmin,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
  });

  const displayProducts = useMemo(() => (
    products.map((product) => {
      const normalizedImages = normalizeProductMedia(product.image_url, normalizeStringArray(product.image_urls));
      return {
        ...product,
        ...normalizedImages,
      };
    })
  ), [products]);

  const saveMutation = useMutation({
    mutationFn: (data) => saveProduct({ formData: data, productId: editingProduct?.id || null }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['products'] });
      queryClient.removeQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      toast.success(editingProduct ? 'Product updated!' : 'Product created!');
      setShowForm(false);
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
        ...normalizeProductMedia(current.image_url, [...current.image_urls, ...urls]),
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
      ...normalizeProductMedia(current.image_url, [...current.image_urls, ...urls]),
    }));
    setExtraImageUrlInput('');
    toast.success(`${urls.length} image URL${urls.length > 1 ? 's' : ''} added.`);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setForm(hydrateProductForm(product));
    setExtraImageUrlInput('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNew = () => {
    setEditingProduct(null);
    setForm(buildEmptyProductForm());
    setExtraImageUrlInput('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (user && !isAdmin) {
    return <div className="p-8 text-center text-gray-500">Admin access required.</div>;
  }

  const availableSubcategories = CATEGORY_SUBCATEGORIES[form.category] || [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <ProductImportCenter open={showImportCenter} onOpenChange={setShowImportCenter} />
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
            <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Main Product Image</Label>
              <div className="flex items-start gap-4">
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                  {form.image_url
                    ? <img src={form.image_url} alt="" className="w-full h-full object-cover" />
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

                  {form.image_url && <p className="text-xs text-green-600 font-medium">âœ“ Main image ready</p>}
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
                <p className="text-xs text-green-600 mt-2 font-medium">âœ“ Video ready: {form.video_url.length > 80 ? `${form.video_url.slice(0, 80)}...` : form.video_url}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="e.g. iPhone 14 Pro Max" />
            </div>

            <div>
              <Label>Step 1 â€” Main Category *</Label>
              <Select value={form.main_group} onValueChange={(value) => setForm((current) => ({ ...current, main_group: value, category: '', brand: '', custom_brand: '', subcategory: '', custom_subcategory: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger>
                <SelectContent>
                  {MAIN_CATEGORY_GROUPS.map((group) => <SelectItem key={group.id} value={group.id}>{group.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Step 2 â€” Category *</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((current) => ({ ...current, category: value, brand: '', custom_brand: '', subcategory: '', custom_subcategory: '' }))}
                disabled={!form.main_group}
              >
                <SelectTrigger><SelectValue placeholder={form.main_group ? 'Select category' : 'Select main category first'} /></SelectTrigger>
                <SelectContent>
                  {(GROUP_CATEGORIES[form.main_group] || []).map((category) => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Step 3 â€” Brand *</Label>
              <Select
                value={form.brand}
                onValueChange={(value) => setForm((current) => ({ ...current, brand: value, custom_brand: '', subcategory: '', custom_subcategory: '' }))}
                disabled={!form.category}
              >
                <SelectTrigger><SelectValue placeholder={form.category ? 'Select brand' : 'Select category first'} /></SelectTrigger>
                <SelectContent>
                  {(GROUP_BRANDS[form.main_group] || []).map((brand) => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.brand === 'Other (type below)' && (
                <Input
                  className="mt-2"
                  placeholder="Type your brand name..."
                  value={form.custom_brand}
                  onChange={(e) => setForm((current) => ({ ...current, custom_brand: e.target.value }))}
                />
              )}
            </div>

            <div>
              <Label>Step 4 â€” Product Type / Subcategory</Label>
              <Select
                value={form.subcategory}
                onValueChange={(value) => setForm((current) => ({ ...current, subcategory: value, custom_subcategory: '' }))}
                disabled={!form.category}
              >
                <SelectTrigger><SelectValue placeholder={form.category ? 'Select product type' : 'Select category first'} /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {availableSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">âœï¸ Other (type my own...)</SelectItem>
                </SelectContent>
              </Select>
              {form.subcategory === '__custom__' && (
                <Input
                  className="mt-2"
                  placeholder="Type product type / subcategory..."
                  value={form.custom_subcategory}
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
              <Label className="font-semibold block mb-2">Description (Rich Text)</Label>
              <p className="text-xs text-gray-500 mb-2">Use the toolbar to format text with bold, bullets, headings, font size, and more.</p>
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

            <div className="md:col-span-2">
              <Label className="font-semibold block mb-1">ðŸ“ Homepage Sections</Label>
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
              <Label className="font-semibold block">ðŸŽ¨ Customer Options (optional)</Label>
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
                      {['5W', '10W', '18W', '20W', '25W', '33W', '45W', '65W', '100W', '120W', '150W'].map((wattage) => (
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
                      {['USB-C', 'Lightning', 'Micro USB', 'Type-A', 'Wireless', 'Original', 'Compatible', 'Standard', 'Pro', 'Plus', 'Max'].map((type) => (
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
                  <span className="text-sm font-medium text-gray-700">ðŸ’¬ Reviews Enabled</span>
                </label>

                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${form.is_visible ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}
                  onClick={() => setForm((current) => ({ ...current, is_visible: !current.is_visible }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.is_visible ? 'bg-green-600 border-green-600' : 'border-red-400 bg-red-100'}`}>
                    {form.is_visible ? <Eye className="h-3 w-3 text-white" /> : <EyeOff className="h-3 w-3 text-red-500" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {form.is_visible ? 'ðŸ‘ï¸ Visible to Customers' : 'ðŸš« Hidden from Customers'}
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
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingProduct(null); setForm(buildEmptyProductForm()); setExtraImageUrlInput(''); }}>
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
                      title={isHidden ? 'Hidden â€” click to show' : 'Visible â€” click to hide'}
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
      {!isLoading && displayProducts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>No products yet. Click "Add Product" to get started.</p>
        </div>
      )}
    </div>
  );
}
