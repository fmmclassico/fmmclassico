import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Save, X, Plus, Trash2, Home, Grid3X3, Image, Type, Eye, EyeOff } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CORE_SECTIONS = [
  { id: 'flash', name: 'Flash Sale', icon: '⚡' },
  { id: 'deals', name: 'CLASSICO Deals', icon: '🎁' },
  { id: 'donkomi', name: 'Donkomi (Best Prices)', icon: '💰' },
  { id: 'arrivals', name: 'New Arrivals', icon: '✨' },
  { id: 'topselling', name: 'Top Selling', icon: '🔥' },
];

const CATEGORY_DEFS = [
  { id: 'phones', name: 'Phones', defaultImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600' },
  { id: 'phone_accessories', name: 'Phone Accessories', defaultImage: 'https://mate.net.in/public/uploads/all/UsReqZvujmEjMUb27qlTtRcCG8Pf18SyULO4HW7U.jpg' },
  { id: 'electronics', name: 'Electronics', defaultImage: 'https://sp-ao.shortpixel.ai/client/to_auto,q_glossy,ret_img,w_800,h_586/https://ikonic.com/wp-content/uploads/2023/10/industries-consumer-electronics.jpeg' },
  { id: 'home_appliances', name: 'Home Appliances', defaultImage: 'https://images.unsplash.com/photo-1556909211-36987daf7b4d?w=600' },
];

export default function AdminHomeEditor() {
  const [user, setUser] = useState(null);
  const [localSettings, setLocalSettings] = useState({});
  const [saving, setSaving] = useState({});
  const [uploading, setUploading] = useState({});
  const [customCategories, setCustomCategories] = useState([]);
  const [newHeroTitle, setNewHeroTitle] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [expandedSections, setExpandedSections] = useState({ hero: true });
  const fileRefs = useRef({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
  });

  const { data: banners = [] } = useQuery({
    queryKey: ['promoBanners'],
    queryFn: () => base44.entities.PromoBanner.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-admin'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  useEffect(() => {
    const cats = settings.filter(s => s.key.startsWith('custom_cat_'));
    if (cats.length > 0) {
      const parsed = cats.map(c => {
        try { return JSON.parse(c.value); } catch { return null; }
      }).filter(Boolean);
      setCustomCategories(parsed);
    }
  }, [settings]);

  useEffect(() => {
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    setLocalSettings(map);
  }, [settings]);

  const getSetting = (key) => localSettings[key] ?? '';

  const saveSetting = async (key, value, silent = false) => {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const existing = settings.find(s => s.key === key);
      if (existing) {
        await base44.entities.AppSetting.update(existing.id, { value });
      } else {
        await base44.entities.AppSetting.create({ key, value });
      }
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      if (!silent) toast.success('Saved!');
    } catch {
      toast.error('Failed to save');
    }
    setSaving(s => ({ ...s, [key]: false }));
  };

  const saveAllHero = async () => {
    setSaving(s => ({ ...s, hero_all: true }));
    try {
      for (const key of ['hero_title', 'hero_subtitle', 'hero_cta', 'hero_bg_image']) {
        const val = localSettings[key];
        if (val !== undefined) await saveSetting(key, val, true);
      }
      toast.success('All hero settings saved!');
    } catch {
      toast.error('Save failed');
    }
    setSaving(s => ({ ...s, hero_all: false }));
  };

  const getHiddenIds = (secId) => {
    const raw = localSettings[`home_hidden_${secId}`];
    try { return JSON.parse(raw || '[]'); } catch { return []; }
  };

  const toggleHiddenProduct = async (secId, productId, currentHidden) => {
    const key = `home_hidden_${secId}`;
    const newHidden = currentHidden.includes(productId)
      ? currentHidden.filter(id => id !== productId)
      : [...currentHidden, productId];
    setLocalSettings(l => ({ ...l, [key]: JSON.stringify(newHidden) }));
    await saveSetting(key, JSON.stringify(newHidden), true);
    toast.success(currentHidden.includes(productId) ? 'Product shown' : 'Product hidden');
  };

  const handleUpload = async (key, file) => {
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLocalSettings(l => ({ ...l, [key]: file_url }));
      await saveSetting(key, file_url);
    } catch {
      toast.error('Upload failed');
    }
    setUploading(u => ({ ...u, [key]: false }));
  };

  const handleRemoveImage = async (key) => {
    setLocalSettings(l => ({ ...l, [key]: '' }));
    await saveSetting(key, '');
  };

  const handleAddBanner = async () => {
    if (!bannerUrl.trim()) return;
    await base44.entities.PromoBanner.create({
      title: 'New Banner',
      subtitle: '',
      image_url: bannerUrl.trim(),
      is_active: true,
      order: banners.length,
    });
    queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
    setBannerUrl('');
    toast.success('Banner added!');
  };

  const handleDeleteBanner = async (id) => {
    await base44.entities.PromoBanner.delete(id);
    queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
    toast.success('Removed');
  };

  const handleBannerFieldSave = async (banner, field, value) => {
    await base44.entities.PromoBanner.update(banner.id, { [field]: value });
    queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
    toast.success('Saved!');
  };

  const addCustomCategory = async () => {
    if (!newHeroTitle.trim()) return;
    const newCat = { id: `custom_${Date.now()}`, name: newHeroTitle, image: '', desc: '' };
    const key = `custom_cat_${newCat.id}`;
    await base44.entities.AppSetting.create({ key, value: JSON.stringify(newCat) });
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setCustomCategories([...customCategories, newCat]);
    setNewHeroTitle('');
    toast.success('Category added!');
  };

  const updateCustomCategory = async (cat, field, value) => {
    const updated = { ...cat, [field]: value };
    const key = `custom_cat_${cat.id}`;
    const existing = settings.find(s => s.key === key);
    if (existing) {
      await base44.entities.AppSetting.update(existing.id, { value: JSON.stringify(updated) });
    }
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setCustomCategories(customCategories.map(c => c.id === cat.id ? updated : c));
    toast.success('Saved!');
  };

  const deleteCustomCategory = async (catId) => {
    const key = `custom_cat_${catId}`;
    const existing = settings.find(s => s.key === key);
    if (existing) {
      await base44.entities.AppSetting.delete(existing.id);
    }
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setCustomCategories(customCategories.filter(c => c.id !== catId));
    toast.success('Removed!');
  };

  const addCustomSection = async () => {
    if (!newSectionTitle.trim()) return;
    const idx = CORE_SECTIONS.length + customCategories.length;
    await base44.entities.AppSetting.create({
      key: `custom_section_${idx}`,
      value: newSectionTitle,
    });
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setNewSectionTitle('');
    toast.success('Section added!');
  };

  const getSectionTitle = (idx) => {
    if (idx < CORE_SECTIONS.length) {
      const sec = CORE_SECTIONS[idx];
      return getSetting(`home_${sec.id}_title`) || sec.name;
    } else {
      return getSetting(`custom_section_${idx}`) || '';
    }
  };

  const saveSectionTitle = async (idx, value) => {
    if (idx < CORE_SECTIONS.length) {
      const sec = CORE_SECTIONS[idx];
      await saveSetting(`home_${sec.id}_title`, value);
    } else {
      const key = `custom_section_${idx}`;
      const existing = settings.find(s => s.key === key);
      if (existing) {
        await base44.entities.AppSetting.update(existing.id, { value });
      } else {
        await base44.entities.AppSetting.create({ key, value });
      }
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    }
    toast.success('Saved!');
  };

  const deleteCustomSection = async (idx) => {
    const key = `custom_section_${idx}`;
    const existing = settings.find(s => s.key === key);
    if (existing) {
      await base44.entities.AppSetting.delete(existing.id);
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Removed!');
    }
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Home className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Home & Categories Editor</h1>
          <p className="text-gray-500 text-sm">Edit text, images, and sections across your store pages</p>
        </div>
        <Badge className="ml-auto bg-indigo-100 text-indigo-700 border-indigo-200">Admin Only</Badge>
      </div>

      <Tabs defaultValue="hero">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="hero" className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" />Hero Banner</TabsTrigger>
          <TabsTrigger value="sections" className="flex items-center gap-1.5"><Type className="h-3.5 w-3.5" />Section Titles</TabsTrigger>
          <TabsTrigger value="banners" className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />Promo Banners</TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1.5"><Grid3X3 className="h-3.5 w-3.5" />Category Cards</TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-1.5">🛒 Section Products</TabsTrigger>
        </TabsList>

        {/* ── HERO ── */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Hero / Top Banner Section</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">Edit hero text and background image</p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={saveAllHero} disabled={saving['hero_all']}>
                  {saving['hero_all'] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <p className="font-semibold text-sm text-gray-700">Main Hero Banner</p>
                {['hero_title', 'hero_subtitle', 'hero_cta'].map(key => (
                  <SettingTextRow
                    key={key}
                    label={key === 'hero_title' ? 'Title' : key === 'hero_subtitle' ? 'Subtitle' : 'Button Text'}
                    value={getSetting(key)}
                    onChange={v => setLocalSettings(l => ({ ...l, [key]: v }))}
                    onSave={() => saveSetting(key, getSetting(key))}
                    saving={saving[key]}
                  />
                ))}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Background Image</p>
                  <FileUploadBar
                    label="Upload Hero Background"
                    settingKey="hero_bg_image"
                    currentUrl={getSetting('hero_bg_image')}
                    uploading={uploading['hero_bg_image']}
                    onUpload={f => handleUpload('hero_bg_image', f)}
                    onRemove={() => handleRemoveImage('hero_bg_image')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SECTION TITLES ── */}
        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Homepage Sections</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Edit core sections or add custom ones</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Core Sections</p>
                {CORE_SECTIONS.map((sec, idx) => (
                  <div key={sec.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{sec.icon}</span>
                      <p className="text-sm font-medium text-gray-700 flex-1">{sec.name}</p>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={getSetting(`home_${sec.id}_visible`) !== 'false'} onChange={e => saveSetting(`home_${sec.id}_visible`, e.target.checked ? 'true' : 'false')} />
                        Visible
                      </label>
                    </div>
                    <SettingTextRow
                      label="Section Title"
                      value={getSetting(`home_${sec.id}_title`) || sec.name}
                      onChange={v => setLocalSettings(l => ({ ...l, [`home_${sec.id}_title`]: v }))}
                      onSave={() => saveSetting(`home_${sec.id}_title`, getSetting(`home_${sec.id}_title`) || sec.name)}
                      saving={saving[`home_${sec.id}_title`]}
                    />
                  </div>
                ))}
              </div>

              {settings.filter(s => s.key.startsWith('custom_section_')).length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-semibold text-gray-700">Custom Sections</p>
                  {settings.filter(s => s.key.startsWith('custom_section_')).map(sec => (
                    <div key={sec.id} className="p-3 bg-blue-50 rounded-lg flex gap-2">
                      <input
                        type="text"
                        defaultValue={sec.value}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        onBlur={e => saveSectionTitle(parseInt(sec.key.split('_')[2]), e.target.value)}
                      />
                      <Button size="sm" variant="destructive" className="h-8" onClick={() => deleteCustomSection(parseInt(sec.key.split('_')[2]))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 space-y-2">
                <p className="text-sm font-semibold text-indigo-900">Add Custom Section</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., Featured Brands, Weekend Specials..."
                    value={newSectionTitle}
                    onChange={e => setNewSectionTitle(e.target.value)}
                    className="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <Button size="sm" className="gap-1.5" onClick={addCustomSection}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PROMO BANNERS ── */}
        <TabsContent value="banners">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Promotional Banners (Slider)</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Upload image files or use URLs</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-green-900">Add New Banner</p>
                <input
                  ref={el => fileRefs.current['banner_upload'] = el}
                  type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    if (!e.target.files?.[0]) return;
                    setUploading(u => ({ ...u, banner_upload: true }));
                    try {
                      const { file_url } = await base44.integrations.Core.UploadFile({ file: e.target.files[0] });
                      await base44.entities.PromoBanner.create({
                        title: 'New Banner',
                        subtitle: '',
                        image_url: file_url,
                        is_active: true,
                        order: banners.length,
                      });
                      queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
                      toast.success('Banner added!');
                    } catch {
                      toast.error('Upload failed');
                    }
                    setUploading(u => ({ ...u, banner_upload: false }));
                    e.target.value = '';
                  }}
                />
                <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => fileRefs.current['banner_upload']?.click()} disabled={uploading['banner_upload']}>
                  {uploading['banner_upload'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Banner Image
                </Button>
              </div>

              {banners.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">No banners yet. Upload one above.</p>
              )}
              {banners.map(b => (
                <div key={b.id} className="border rounded-xl overflow-hidden bg-gray-50">
                  {b.image_url && <img src={b.image_url} alt={b.title} className="w-full h-32 object-cover" />}
                  <div className="p-3 space-y-2">
                    <EditableField label="Title" value={b.title} onSave={v => handleBannerFieldSave(b, 'title', v)} />
                    <EditableField label="Subtitle" value={b.subtitle} onSave={v => handleBannerFieldSave(b, 'subtitle', v)} />
                    <EditableField label="CTA Text" value={b.cta_text} onSave={v => handleBannerFieldSave(b, 'cta_text', v)} />
                    <EditableField label="CTA Link" value={b.cta_link} onSave={v => handleBannerFieldSave(b, 'cta_link', v)} />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Change Image:</p>
                      <input
                        ref={el => fileRefs.current[`banner_${b.id}`] = el}
                        type="file" accept="image/*" className="hidden"
                        onChange={async (e) => {
                          if (!e.target.files?.[0]) return;
                          setUploading(u => ({ ...u, [`banner_${b.id}`]: true }));
                          try {
                            const { file_url } = await base44.integrations.Core.UploadFile({ file: e.target.files[0] });
                            await base44.entities.PromoBanner.update(b.id, { image_url: file_url });
                            queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
                            toast.success('Image updated!');
                          } catch {
                            toast.error('Upload failed');
                          }
                          setUploading(u => ({ ...u, [`banner_${b.id}`]: false }));
                          e.target.value = '';
                        }}
                      />
                      <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1.5" onClick={() => fileRefs.current[`banner_${b.id}`]?.click()} disabled={uploading[`banner_${b.id}`]}>
                        {uploading[`banner_${b.id}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Upload New Image
                      </Button>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={!!b.is_active} onChange={e => handleBannerFieldSave(b, 'is_active', e.target.checked)} />
                        Active
                      </label>
                      <button onClick={() => handleDeleteBanner(b.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CATEGORIES ── */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Cards</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Edit default categories or add custom ones</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-700">Default Categories</p>
                {CATEGORY_DEFS.map(cat => {
                  const bgKey = `cat_bg_${cat.id}`;
                  const nameKey = `cat_text_${cat.id}_name`;
                  const descKey = `cat_text_${cat.id}_desc`;
                  const currentImg = getSetting(bgKey) || cat.defaultImage;
                  return (
                    <div key={cat.id} className="border rounded-xl overflow-hidden">
                      <div className="relative h-28">
                        <img src={currentImg} alt={cat.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                          <input ref={el => fileRefs.current[bgKey] = el} type="file" accept="image/*" className="hidden"
                            onChange={e => e.target.files?.[0] && handleUpload(bgKey, e.target.files[0])} />
                          <button
                            className="flex items-center gap-1 bg-white/90 text-gray-800 text-xs px-3 py-1.5 rounded-lg hover:bg-white font-medium"
                            onClick={() => fileRefs.current[bgKey]?.click()}
                          >
                            {uploading[bgKey] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Upload
                          </button>
                          {getSetting(bgKey) && (
                            <button
                              className="flex items-center gap-1 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 font-medium"
                              onClick={() => handleRemoveImage(bgKey)}
                            >
                              <X className="h-3.5 w-3.5" /> Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-4 space-y-3 bg-gray-50">
                        <p className="text-sm font-bold text-gray-700">{cat.name}</p>
                        <SettingTextRow
                          label="Card Title"
                          value={getSetting(nameKey) || cat.name}
                          onChange={v => setLocalSettings(l => ({ ...l, [nameKey]: v }))}
                          onSave={() => saveSetting(nameKey, getSetting(nameKey) || cat.name)}
                          saving={saving[nameKey]}
                        />
                        <SettingTextRow
                          label="Description"
                          value={getSetting(descKey)}
                          onChange={v => setLocalSettings(l => ({ ...l, [descKey]: v }))}
                          onSave={() => saveSetting(descKey, getSetting(descKey))}
                          saving={saving[descKey]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {customCategories.length > 0 && (
                <div className="space-y-4 pt-6 border-t">
                  <p className="text-sm font-semibold text-gray-700">Custom Categories</p>
                  {customCategories.map(cat => (
                    <div key={cat.id} className="border border-purple-200 rounded-xl overflow-hidden bg-purple-50">
                      {cat.image && <img src={cat.image} alt={cat.name} className="w-full h-32 object-cover" />}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-700">{cat.name}</p>
                          <Button size="sm" variant="destructive" className="h-7" onClick={() => deleteCustomCategory(cat.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <input
                          type="text" placeholder="Title"
                          defaultValue={cat.name}
                          onBlur={e => updateCustomCategory(cat, 'name', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text" placeholder="Description"
                          defaultValue={cat.desc}
                          onBlur={e => updateCustomCategory(cat, 'desc', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                        <input
                          ref={el => fileRefs.current[`custom_${cat.id}`] = el}
                          type="file" accept="image/*" className="hidden"
                          onChange={async (e) => {
                            if (!e.target.files?.[0]) return;
                            setUploading(u => ({ ...u, [`custom_${cat.id}`]: true }));
                            try {
                              const { file_url } = await base44.integrations.Core.UploadFile({ file: e.target.files[0] });
                              await updateCustomCategory(cat, 'image', file_url);
                            } catch {
                              toast.error('Upload failed');
                            }
                            setUploading(u => ({ ...u, [`custom_${cat.id}`]: false }));
                            e.target.value = '';
                          }}
                        />
                        <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1.5" onClick={() => fileRefs.current[`custom_${cat.id}`]?.click()}>
                          {uploading[`custom_${cat.id}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          Upload Image
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                <p className="text-sm font-semibold text-purple-900">Add Custom Category</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., Gaming Gear, Smart Devices..."
                    value={newHeroTitle}
                    onChange={e => setNewHeroTitle(e.target.value)}
                    className="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <Button size="sm" className="gap-1.5" onClick={addCustomCategory}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SECTION PRODUCTS ── */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Homepage Section Products</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Hide or delete products from each homepage section. Tap ⭐⚡🔥 on the product card to toggle section tags in Manage Products.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { id: 'flash', label: '⚡ Flash Sale / CLASSICO Deals', field: 'flash_sale' },
                { id: 'featured', label: '⭐ Featured Deals', field: 'featured' },
                { id: 'donkomi', label: '🔥 Donkomi Best Prices', field: 'donkomi' },
              ].map(sec => {
                const sectionProducts = products.filter(p => p[sec.field]);
                const hiddenIds = getHiddenIds(sec.id);
                return (
                  <div key={sec.id} className="border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                      <p className="font-bold text-sm text-gray-800">{sec.label}</p>
                      <span className="text-xs text-gray-500">
                        {sectionProducts.length - hiddenIds.filter(id => sectionProducts.find(p => p.id === id)).length} visible / {sectionProducts.length} total
                      </span>
                    </div>
                    {sectionProducts.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-6">No products tagged for this section yet.<br /><span className="text-xs">Go to Manage Products and toggle the tag on products.</span></p>
                    ) : (
                      <div className="divide-y max-h-80 overflow-y-auto">
                        {sectionProducts.map(p => {
                          const isHidden = hiddenIds.includes(p.id);
                          return (
                            <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${isHidden ? 'bg-red-50' : 'bg-white'}`}>
                              {p.image_url && <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold line-clamp-1 ${isHidden ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{p.name}</p>
                                <p className="text-xs text-gray-400">₵{p.price?.toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => toggleHiddenProduct(sec.id, p.id, hiddenIds)}
                                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${isHidden ? 'bg-green-100 border-green-400 text-green-700 hover:bg-green-200' : 'bg-orange-100 border-orange-300 text-orange-600 hover:bg-orange-200'}`}
                                >
                                  {isHidden ? <><Eye className="h-3 w-3" /> Show</> : <><EyeOff className="h-3 w-3" /> Hide</>}
                                </button>
                                <button
                                  onClick={() => {
                                    if (!confirm(`Remove "${p.name}" from ${sec.label}? This will un-tag it from this section.`)) return;
                                    base44.entities.Product.update(p.id, { [sec.field]: false }).then(() => {
                                      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
                                      queryClient.invalidateQueries({ queryKey: ['products'] });
                                      toast.success('Removed from section');
                                    });
                                  }}
                                  className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border bg-red-100 border-red-300 text-red-600 hover:bg-red-200 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function SettingTextRow({ label, value, onChange, onSave, saving }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
        <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5 shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function ImageUploadRow({ label, settingKey, currentUrl, uploading, fileRef, onUpload, onRemove, onUrlSave }) {
  const [urlInput, setUrlInput] = useState(currentUrl || '');
  useEffect(() => { setUrlInput(currentUrl || ''); }, [currentUrl]);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-2">{label}</label>
      {currentUrl && (
        <div className="relative mb-2">
          <img src={currentUrl} alt="current" className="w-full h-32 object-cover rounded-lg border" />
          <button onClick={onRemove} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2 mb-2">
        <input
          ref={fileRef}
          type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])}
        />
        <Button size="sm" variant="outline" onClick={() => fileRef?.current?.click()} disabled={uploading} className="gap-1.5">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload File
        </Button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Or paste image URL here..."
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-1.5 text-xs"
        />
        <Button size="sm" className="text-xs h-8 px-3" onClick={() => onUrlSave(urlInput)}>
          <Save className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function EditableField({ label, value, onSave }) {
  const [v, setV] = useState(value || '');
  useEffect(() => { setV(value || ''); }, [value]);
  return (
    <div className="flex gap-2 items-center">
      <label className="text-xs text-gray-500 w-20 shrink-0">{label}:</label>
      <input
        type="text"
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { if (v !== (value || '')) onSave(v); }}
        className="flex-1 border rounded px-2 py-1 text-xs"
        placeholder={`${label}...`}
      />
    </div>
  );
}

function FileUploadBar({ label, settingKey, currentUrl, uploading, onUpload, onRemove }) {
  const fileRef = useRef(null);
  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])}
      />
      {currentUrl && <img src={currentUrl} alt="current" className="w-full h-24 object-cover rounded border" />}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => fileRef?.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {label}
        </Button>
        {currentUrl && (
          <Button size="sm" variant="destructive" onClick={onRemove}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}