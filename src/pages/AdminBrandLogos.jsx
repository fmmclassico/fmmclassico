import React, { useMemo, useState } from 'react';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBrandDirectory, getBrandLogo, normalizeBrandKey } from '@/lib/brandDirectory';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ImagePlus, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_BRANDS = ['Apple', 'Samsung', 'Tecno', 'Hisense', 'TCL', 'Oraimo', 'Sony', 'JBL', 'Infinix', 'Itel', 'Xiaomi', 'LG', 'Midea', 'Nasco', 'Roch', 'Hoffman', 'Silver Crest'];
const CUSTOM_BRANDS_KEY = 'custom_brands_list';

function parseCustomBrands(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

export default function AdminBrandLogos() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [uploading, setUploading] = useState({});
  const [newBrandName, setNewBrandName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    appClient.auth.me().then((currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => appClient.entities.AppSetting.list(),
    enabled: isAdmin,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-admin'],
    queryFn: () => appClient.entities.Product.list('-created_date', 300),
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = settings.find((setting) => setting.key === key);
      if (existing) return appClient.entities.AppSetting.update(existing.id, { value });
      return appClient.entities.AppSetting.create({ key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
    },
  });

  const customBrands = useMemo(() => {
    const raw = settings.find((setting) => setting.key === CUSTOM_BRANDS_KEY)?.value || '[]';
    return parseCustomBrands(raw);
  }, [settings]);

  const allBrandEntries = useMemo(() => {
    return getBrandDirectory(settings, products);
  }, [settings, products]);

  const defaultBrandKeys = useMemo(() => new Set(DEFAULT_BRANDS.map((brand) => normalizeBrandKey(brand))), []);
  const customBrandKeys = useMemo(() => new Set(customBrands.map((brand) => normalizeBrandKey(brand))), [customBrands]);

  const customBrandEntries = allBrandEntries.filter((entry) => customBrandKeys.has(normalizeBrandKey(entry.sourceName)));
  const defaultBrandEntries = allBrandEntries.filter((entry) => defaultBrandKeys.has(normalizeBrandKey(entry.sourceName)));
  const discoveredBrandEntries = allBrandEntries.filter((entry) => {
    const key = normalizeBrandKey(entry.sourceName);
    return !defaultBrandKeys.has(key) && !customBrandKeys.has(key);
  });

  const allKnownBrandKeys = new Set(allBrandEntries.map((entry) => normalizeBrandKey(entry.sourceName)));

  const getLogoValue = (brand) => getBrandLogo(settings, brand);

  const handleUpload = async (brand, file) => {
    if (!file) return;
    const key = `brand_logo_${normalizeBrandKey(brand)}`;
    setUploading((current) => ({ ...current, [brand]: true }));

    try {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      await saveMutation.mutateAsync({ key, value: file_url });
      toast.success(`${brand} logo updated!`);
    } catch (error) {
      console.error('Brand logo upload failed:', error);
      toast.error(`Unable to update ${brand} logo. Please try again.`);
    } finally {
      setUploading((current) => ({ ...current, [brand]: false }));
    }
  };

  const handleRemoveLogo = async (brand) => {
    try {
      const key = `brand_logo_${normalizeBrandKey(brand)}`;
      await saveMutation.mutateAsync({ key, value: '' });
      toast.success(`${brand} logo removed.`);
    } catch (error) {
      console.error('Remove logo failed:', error);
      toast.error(`Unable to remove ${brand} logo.`);
    }
  };

  const handleAddBrand = async () => {
    const name = newBrandName.trim();
    if (!name) {
      toast.error('Enter a brand name');
      return;
    }

    if (allKnownBrandKeys.has(normalizeBrandKey(name))) {
      toast.error('Brand already exists');
      return;
    }

    const updated = [...customBrands, name];

    try {
      await saveMutation.mutateAsync({ key: CUSTOM_BRANDS_KEY, value: JSON.stringify(updated) });
      setNewBrandName('');
      setShowAddForm(false);
      toast.success(`${name} added!`);
    } catch (error) {
      console.error('Add brand failed:', error);
      toast.error('Unable to add this brand right now.');
    }
  };

  const handleDeleteBrand = async (brand) => {
    if (!confirm(`Delete brand "${brand}"? Its logo will also be removed.`)) return;

    try {
      const updated = customBrands.filter((item) => normalizeBrandKey(item) !== normalizeBrandKey(brand));
      await saveMutation.mutateAsync({ key: CUSTOM_BRANDS_KEY, value: JSON.stringify(updated) });
      await saveMutation.mutateAsync({ key: `brand_logo_${normalizeBrandKey(brand)}`, value: '' });
      toast.success(`${brand} removed`);
    } catch (error) {
      console.error('Delete brand failed:', error);
      toast.error(`Unable to remove ${brand}.`);
    }
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Shop by Brand — Logo Manager</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" className="gap-1.5 bg-[#1B3A6B] text-white hover:bg-[#152d56]">
          <Plus className="h-4 w-4" /> Add Brand
        </Button>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Upload logos for default brands, custom brands, and any new brands discovered from Manage Products.
      </p>

      {showAddForm && (
        <Card className="mb-5 border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-800">Add New Brand</h3>
          <div className="flex gap-2">
            <Input
              value={newBrandName}
              onChange={(event) => setNewBrandName(event.target.value)}
              placeholder="Brand name e.g. Vivo, Realme, Panasonic..."
              onKeyDown={(event) => event.key === 'Enter' && handleAddBrand()}
              className="flex-1"
            />
            <Button onClick={handleAddBrand} className="bg-[#1B3A6B] text-white hover:bg-[#152d56]">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {discoveredBrandEntries.length > 0 && (
        <div className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Brands from Products</p>
          <p className="mb-3 text-xs text-gray-500">These brands were found in Manage Products and are now ready for logo customization.</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {discoveredBrandEntries.map((entry) => (
              <BrandCard
                key={entry.key}
                brand={entry.sourceName}
                label={entry.displayName}
                logo={getLogoValue(entry.sourceName)}
                isUploading={uploading[entry.sourceName]}
                isCustom={false}
                onUpload={(file) => handleUpload(entry.sourceName, file)}
                onRemoveLogo={() => handleRemoveLogo(entry.sourceName)}
                onDeleteBrand={null}
              />
            ))}
          </div>
        </div>
      )}

      {customBrandEntries.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Custom Brands (can be deleted)</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {customBrandEntries.map((entry) => (
              <BrandCard
                key={entry.key}
                brand={entry.sourceName}
                label={entry.displayName}
                logo={getLogoValue(entry.sourceName)}
                isUploading={uploading[entry.sourceName]}
                isCustom={true}
                onUpload={(file) => handleUpload(entry.sourceName, file)}
                onRemoveLogo={() => handleRemoveLogo(entry.sourceName)}
                onDeleteBrand={() => handleDeleteBrand(entry.sourceName)}
              />
            ))}
          </div>
        </div>
      )}

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Default Brands</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {defaultBrandEntries.map((entry) => (
          <BrandCard
            key={entry.key}
            brand={entry.sourceName}
            label={entry.displayName}
            logo={getLogoValue(entry.sourceName)}
            isUploading={uploading[entry.sourceName]}
            isCustom={false}
            onUpload={(file) => handleUpload(entry.sourceName, file)}
            onRemoveLogo={() => handleRemoveLogo(entry.sourceName)}
            onDeleteBrand={null}
          />
        ))}
      </div>
    </div>
  );
}

function BrandCard({ brand, label, logo, isUploading, onUpload, onRemoveLogo, onDeleteBrand }) {
  return (
    <Card className="relative flex flex-col items-center gap-2 p-3">
      <span className="text-center text-xs font-bold leading-tight text-gray-700">{label || brand}</span>
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
        {logo
          ? <img src={logo} alt={label || brand} className="max-h-full max-w-full object-contain p-1" />
          : <ImagePlus className="h-6 w-6 text-gray-300" />}
      </div>
      <label className="w-full cursor-pointer">
        <div className={`flex w-full items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${isUploading ? 'bg-gray-100 text-gray-400' : 'border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {isUploading ? 'Uploading...' : logo ? 'Replace' : 'Upload Logo'}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isUploading}
          onChange={(event) => onUpload(event.target.files?.[0])}
        />
      </label>
      <button
        onClick={onRemoveLogo}
        disabled={!logo}
        className={`flex items-center gap-1 text-[11px] transition-colors ${logo ? 'text-red-400 hover:text-red-600' : 'cursor-not-allowed text-gray-200'}`}
      >
        <Trash2 className="h-3 w-3" /> Remove Logo
      </button>
      <button
        onClick={onDeleteBrand || (() => {})}
        disabled={!onDeleteBrand}
        className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] transition-colors ${onDeleteBrand ? 'border-red-200 text-red-600 hover:bg-red-50' : 'cursor-not-allowed border-gray-100 text-gray-300'}`}
        title={onDeleteBrand ? 'Remove brand from app' : 'Default or discovered brand cannot be removed here'}
      >
        <X className="h-3 w-3" /> {onDeleteBrand ? 'Remove Brand' : 'Managed'}
      </button>
    </Card>
  );
}
