import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ImagePlus, Trash2, Plus, X, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'sonner';
import { BRAND_DIRECTORY_KEY, getBrandDirectory, getBrandProductCount, getBrandLogo, getHomepageSectionSettings, HOMEPAGE_SECTION_SETTINGS_KEY, HOMEPAGE_SECTION_DEFAULTS, LEGACY_CUSTOM_BRANDS_KEY, normalizeBrandKey } from '@/lib/brandDirectory';

function createEmptyDraft(entry = {}) {
  return {
    sourceName: entry.sourceName || '',
    displayName: entry.displayName || entry.sourceName || '',
    visible: entry.visible !== false,
    showName: entry.showName !== false,
    sortOrder: Number.isFinite(Number(entry.sortOrder)) ? Number(entry.sortOrder) : 999,
  };
}

export default function AdminBrandLogos() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [uploading, setUploading] = useState({});
  const [newBrandName, setNewBrandName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingBrand, setSavingBrand] = useState({});
  const [brandDrafts, setBrandDrafts] = useState({});
  const [sectionDraft, setSectionDraft] = useState(HOMEPAGE_SECTION_DEFAULTS);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then((u) => { setUser(u); setIsAdmin(u?.role === 'admin'); }).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const result = await base44.entities.AppSetting.list();
      return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    },
    enabled: isAdmin,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-admin-brand-directory'],
    queryFn: async () => {
      const result = await base44.entities.Product.list('-created_date', 500);
      return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = settings.find((setting) => setting.key === key);
      if (existing) return base44.entities.AppSetting.update(existing.id, { value });
      return base44.entities.AppSetting.create({ key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin-brand-directory'] });
    },
  });

  const brandDirectory = useMemo(() => getBrandDirectory(settings, products), [settings, products]);

  React.useEffect(() => {
    const nextDrafts = {};
    brandDirectory.forEach((entry) => {
      nextDrafts[entry.key] = createEmptyDraft(entry);
    });
    setBrandDrafts(nextDrafts);
  }, [brandDirectory]);

  React.useEffect(() => {
    setSectionDraft(getHomepageSectionSettings(settings));
  }, [settings]);

  const legacyCustomBrands = useMemo(() => {
    const raw = settings.find((setting) => setting.key === LEGACY_CUSTOM_BRANDS_KEY)?.value || '[]';
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [settings]);

  const persistBrandDirectory = async (nextDirectory) => {
    await saveMutation.mutateAsync({ key: BRAND_DIRECTORY_KEY, value: JSON.stringify(nextDirectory) });
  };

  const handleUpload = async (brandKey, file) => {
    if (!file) return;
    const key = `brand_logo_${normalizeBrandKey(brandKey)}`;
    setUploading((state) => ({ ...state, [brandKey]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveMutation.mutateAsync({ key, value: file_url });
      toast.success('Brand logo updated!');
    } catch {
      toast.error('Failed to upload logo');
    }
    setUploading((state) => ({ ...state, [brandKey]: false }));
  };

  const handleRemoveLogo = async (brandKey) => {
    await saveMutation.mutateAsync({ key: `brand_logo_${normalizeBrandKey(brandKey)}`, value: '' });
    toast.success('Brand logo removed.');
  };

  const handleDraftChange = (brandKey, field, value) => {
    setBrandDrafts((drafts) => ({
      ...drafts,
      [brandKey]: {
        ...drafts[brandKey],
        [field]: value,
      },
    }));
  };

  const handleSaveBrand = async (entry) => {
    const draft = brandDrafts[entry.key] || createEmptyDraft(entry);
    if (!draft.sourceName.trim()) {
      toast.error('Brand source name is required.');
      return;
    }

    setSavingBrand((state) => ({ ...state, [entry.key]: true }));
    try {
      const nextDirectory = brandDirectory.map((item) => (
        item.key === entry.key
          ? {
              key: entry.key,
              sourceName: draft.sourceName.trim(),
              displayName: draft.displayName.trim() || draft.sourceName.trim(),
              visible: draft.visible !== false,
              showName: draft.showName !== false,
              sortOrder: Number.isFinite(Number(draft.sortOrder)) ? Number(draft.sortOrder) : 999,
            }
          : item
      ));
      await persistBrandDirectory(nextDirectory);
      toast.success('Brand settings saved!');
    } catch {
      toast.error('Failed to save brand settings.');
    }
    setSavingBrand((state) => ({ ...state, [entry.key]: false }));
  };

  const handleAddBrand = async () => {
    const name = newBrandName.trim();
    if (!name) {
      toast.error('Enter a brand name');
      return;
    }

    const exists = brandDirectory.some((entry) => normalizeBrandKey(entry.sourceName) === normalizeBrandKey(name));
    if (exists) {
      toast.error('Brand already exists');
      return;
    }

    const nextDirectory = brandDirectory.concat([{ sourceName: name, displayName: name, visible: true, showName: true, sortOrder: brandDirectory.length + 1 }]);
    await persistBrandDirectory(nextDirectory);

    const nextLegacyCustom = legacyCustomBrands.includes(name) ? legacyCustomBrands : legacyCustomBrands.concat(name);
    await saveMutation.mutateAsync({ key: LEGACY_CUSTOM_BRANDS_KEY, value: JSON.stringify(nextLegacyCustom) });

    setNewBrandName('');
    setShowAddForm(false);
    toast.success(`${name} added!`);
  };

  const handleDeleteBrand = async (entry) => {
    if (!confirm(`Delete brand "${entry.displayName || entry.sourceName}"? Its logo will also be removed.`)) return;

    const nextDirectory = brandDirectory.filter((item) => item.key !== entry.key);
    await persistBrandDirectory(nextDirectory);
    await saveMutation.mutateAsync({ key: `brand_logo_${entry.key}`, value: '' });
    await saveMutation.mutateAsync({
      key: LEGACY_CUSTOM_BRANDS_KEY,
      value: JSON.stringify(legacyCustomBrands.filter((brand) => normalizeBrandKey(brand) !== entry.key)),
    });
    toast.success('Brand removed');
  };

  const handleSaveSectionSettings = async () => {
    const payload = {
      brand_rail: Number(sectionDraft.brand_rail) || HOMEPAGE_SECTION_DEFAULTS.brand_rail,
      flash_sale: Number(sectionDraft.flash_sale) || HOMEPAGE_SECTION_DEFAULTS.flash_sale,
      donkomi: Number(sectionDraft.donkomi) || HOMEPAGE_SECTION_DEFAULTS.donkomi,
      new_arrivals: Number(sectionDraft.new_arrivals) || HOMEPAGE_SECTION_DEFAULTS.new_arrivals,
      top_selling: Number(sectionDraft.top_selling) || HOMEPAGE_SECTION_DEFAULTS.top_selling,
    };
    await saveMutation.mutateAsync({ key: HOMEPAGE_SECTION_SETTINGS_KEY, value: JSON.stringify(payload) });
    toast.success('Homepage section counts updated!');
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Shop by Brand — Admin Manager</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" className="gap-1.5 bg-[#1B3A6B] text-white hover:bg-[#152d56]">
          <Plus className="h-4 w-4" /> Add Brand
        </Button>
      </div>
      <p className="mb-4 text-sm text-gray-500">Manage which brands appear on the site, upload logos from admin only, decide whether names show, and control how many products appear per homepage section.</p>

      <Card className="mb-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">Homepage section counts</h2>
            <p className="text-xs text-gray-500">These counts control how many cards show on Home and Guest Home before users tap <strong>See All</strong>.</p>
          </div>
          <Button onClick={handleSaveSectionSettings} className="bg-[#1B3A6B] text-white hover:bg-[#152d56]">
            <Save className="mr-2 h-4 w-4" /> Save Counts
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['brand_rail', 'Brand Logos'],
            ['flash_sale', 'CLASSICO Deals'],
            ['donkomi', 'Donkomi Deals'],
            ['new_arrivals', 'New Arrivals'],
            ['top_selling', 'Top Selling'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
              <Input type="number" min="1" value={sectionDraft[key]} onChange={(event) => setSectionDraft((prev) => ({ ...prev, [key]: event.target.value }))} />
            </div>
          ))}
        </div>
      </Card>

      {showAddForm && (
        <Card className="mb-5 border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-800">Add New Brand</h3>
          <div className="flex gap-2">
            <Input
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Brand name e.g. Vivo, Realme, Panasonic..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
              className="flex-1"
            />
            <Button onClick={handleAddBrand} className="bg-[#1B3A6B] text-white hover:bg-[#152d56]">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {brandDirectory.map((entry) => {
          const draft = brandDrafts[entry.key] || createEmptyDraft(entry);
          const logo = getBrandLogo(settings, entry.key);
          const productCount = getBrandProductCount(products, entry);
          const canDelete = legacyCustomBrands.some((brand) => normalizeBrandKey(brand) === entry.key);

          return (
            <Card key={entry.key} className="p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {logo ? <img src={logo} alt={entry.displayName} className="max-h-full max-w-full object-contain p-1" /> : <ImagePlus className="h-6 w-6 text-gray-300" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Products using this brand</p>
                  <p className="text-lg font-bold text-gray-800">{productCount}</p>
                </div>
                <div className={`rounded-full px-2 py-1 text-[10px] font-bold ${draft.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {draft.visible ? 'Visible' : 'Hidden'}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Brand key used by products</label>
                  <Input value={draft.sourceName} onChange={(event) => handleDraftChange(entry.key, 'sourceName', event.target.value)} placeholder="Brand source name" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Display name on site</label>
                  <Input value={draft.displayName} onChange={(event) => handleDraftChange(entry.key, 'displayName', event.target.value)} placeholder="Display label shown to users" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Sort order</label>
                  <Input type="number" value={draft.sortOrder} onChange={(event) => handleDraftChange(entry.key, 'sortOrder', event.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleDraftChange(entry.key, 'visible', !draft.visible)} className={`flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold ${draft.visible ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    {draft.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {draft.visible ? 'Visible on site' : 'Hidden on site'}
                  </button>
                  <button type="button" onClick={() => handleDraftChange(entry.key, 'showName', !draft.showName)} className={`flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold ${draft.showName ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    {draft.showName ? 'Show Name' : 'Logo Only'}
                  </button>
                </div>

                <label className="block cursor-pointer">
                  <div className={`flex w-full items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${uploading[entry.key] ? 'bg-gray-100 text-gray-400' : 'border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                    {uploading[entry.key] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {uploading[entry.key] ? 'Uploading...' : logo ? 'Replace Logo' : 'Upload Logo'}
                  </div>
                  <input type="file" accept="image/*" className="hidden" disabled={uploading[entry.key]} onChange={(e) => handleUpload(entry.key, e.target.files?.[0])} />
                </label>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => handleRemoveLogo(entry.key)} disabled={!logo}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remove Logo
                  </Button>
                  <Button className="flex-1 bg-[#1B3A6B] text-white hover:bg-[#152d56]" onClick={() => handleSaveBrand(entry)} disabled={savingBrand[entry.key]}>
                    {savingBrand[entry.key] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                  </Button>
                </div>

                <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteBrand(entry)} disabled={!canDelete}>
                  <X className="mr-2 h-4 w-4" /> {canDelete ? 'Remove Brand' : 'Default / Product-Detected Brand'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
