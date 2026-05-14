import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Save, X, Plus, Trash2, Home, Grid3X3, Image, Type, Link as LinkIcon } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SETTING_KEYS = {
  // Hero banner
  hero_title: { label: 'Hero Title', type: 'text', section: 'hero' },
  hero_subtitle: { label: 'Hero Subtitle', type: 'text', section: 'hero' },
  hero_cta: { label: 'Hero Button Text', type: 'text', section: 'hero' },
  hero_bg_image: { label: 'Hero Background Image', type: 'image', section: 'hero' },
  // Section labels
  home_flash_title: { label: 'Flash Sale Section Title', type: 'text', section: 'sections' },
  home_deals_title: { label: 'CLASSICO Deals Title', type: 'text', section: 'sections' },
  home_donkomi_title: { label: 'Donkomi Section Title', type: 'text', section: 'sections' },
  home_arrivals_title: { label: 'New Arrivals Title', type: 'text', section: 'sections' },
  home_topselling_title: { label: 'Top Selling Title', type: 'text', section: 'sections' },
};

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
  const [bannerUrl, setBannerUrl] = useState('');
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

  useEffect(() => {
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    setLocalSettings(map);
  }, [settings]);

  const getSetting = (key) => localSettings[key] ?? '';

  const saveSetting = async (key, value) => {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const existing = settings.find(s => s.key === key);
      if (existing) {
        await base44.entities.AppSetting.update(existing.id, { value });
      } else {
        await base44.entities.AppSetting.create({ key, value });
      }
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Saved!');
    } catch {
      toast.error('Failed to save');
    }
    setSaving(s => ({ ...s, [key]: false }));
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

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (user?.role !== 'admin') return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

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
        </TabsList>

        {/* ── HERO ── */}
        <TabsContent value="hero">
          <Card>
            <CardHeader><CardTitle className="text-base">Hero / Top Banner Section</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {['hero_title', 'hero_subtitle', 'hero_cta'].map(key => (
                <SettingTextRow
                  key={key}
                  label={SETTING_KEYS[key].label}
                  value={getSetting(key)}
                  onChange={v => setLocalSettings(l => ({ ...l, [key]: v }))}
                  onSave={() => saveSetting(key, getSetting(key))}
                  saving={saving[key]}
                />
              ))}
              <ImageUploadRow
                label="Hero Background Image"
                settingKey="hero_bg_image"
                currentUrl={getSetting('hero_bg_image')}
                uploading={uploading['hero_bg_image']}
                fileRef={el => fileRefs.current['hero_bg_image'] = el}
                onUpload={f => handleUpload('hero_bg_image', f)}
                onRemove={() => handleRemoveImage('hero_bg_image')}
                onUrlSave={url => saveSetting('hero_bg_image', url)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SECTION TITLES ── */}
        <TabsContent value="sections">
          <Card>
            <CardHeader><CardTitle className="text-base">Homepage Section Titles</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {['home_flash_title', 'home_deals_title', 'home_donkomi_title', 'home_arrivals_title', 'home_topselling_title'].map(key => (
                <SettingTextRow
                  key={key}
                  label={SETTING_KEYS[key].label}
                  value={getSetting(key)}
                  onChange={v => setLocalSettings(l => ({ ...l, [key]: v }))}
                  onSave={() => saveSetting(key, getSetting(key))}
                  saving={saving[key]}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PROMO BANNERS ── */}
        <TabsContent value="banners">
          <Card>
            <CardHeader><CardTitle className="text-base">Promotional Banners (Slider)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste image URL to add a new banner..."
                  value={bannerUrl}
                  onChange={e => setBannerUrl(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <Button size="sm" onClick={handleAddBanner} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              {banners.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">No banners yet. Add one above.</p>
              )}
              {banners.map(b => (
                <div key={b.id} className="border rounded-xl overflow-hidden bg-gray-50">
                  {b.image_url && <img src={b.image_url} alt={b.title} className="w-full h-32 object-cover" />}
                  <div className="p-3 space-y-2">
                    <EditableField label="Title" value={b.title} onSave={v => handleBannerFieldSave(b, 'title', v)} />
                    <EditableField label="Subtitle" value={b.subtitle} onSave={v => handleBannerFieldSave(b, 'subtitle', v)} />
                    <EditableField label="CTA Text" value={b.cta_text} onSave={v => handleBannerFieldSave(b, 'cta_text', v)} />
                    <EditableField label="CTA Link" value={b.cta_link} onSave={v => handleBannerFieldSave(b, 'cta_link', v)} />
                    <EditableField label="Image URL" value={b.image_url} onSave={v => handleBannerFieldSave(b, 'image_url', v)} />
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={!!b.is_active} onChange={e => handleBannerFieldSave(b, 'is_active', e.target.checked)} />
                        Active (visible on site)
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
            <CardHeader><CardTitle className="text-base">Category Card Images & Text</CardTitle></CardHeader>
            <CardContent className="space-y-6">
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
                          Upload Image
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
                        label="Card Description"
                        value={getSetting(descKey)}
                        onChange={v => setLocalSettings(l => ({ ...l, [descKey]: v }))}
                        onSave={() => saveSetting(descKey, getSetting(descKey))}
                        saving={saving[descKey]}
                      />
                      {/* Paste URL directly */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Or paste image URL directly:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://..."
                            className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
                            value={getSetting(bgKey)}
                            onChange={e => setLocalSettings(l => ({ ...l, [bgKey]: e.target.value }))}
                          />
                          <Button size="sm" className="text-xs h-7 px-3" onClick={() => saveSetting(bgKey, getSetting(bgKey))}>
                            {saving[bgKey] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
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