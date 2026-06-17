import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ImagePlus, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_BRANDS = ['Apple','Samsung','Tecno','Hisense','TCL','Oraimo','Sony','JBL','Infinix','Itel','Xiaomi','LG','Midea','Nasco','Roch','Hoffman','Silver Crest'];
const CUSTOM_BRANDS_KEY = 'custom_brands_list';

export default function AdminBrandLogos() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [uploading, setUploading] = useState({});
  const [newBrandName, setNewBrandName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setIsAdmin(u?.role === 'admin'); }).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = settings.find(s => s.key === key);
      if (existing) return base44.entities.AppSetting.update(existing.id, { value });
      return base44.entities.AppSetting.create({ key, value });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appSettings'] }),
  });

  // Custom brands stored in AppSetting
  const customBrandsRaw = settings.find(s => s.key === CUSTOM_BRANDS_KEY)?.value || '[]';
  const customBrands = (() => { try { return JSON.parse(customBrandsRaw); } catch { return []; } })();

  // All brands = defaults + custom (no duplicates)
  const allBrands = [...DEFAULT_BRANDS, ...customBrands.filter(b => !DEFAULT_BRANDS.includes(b))];

  const getLogo = (brand) => settings.find(s => s.key === `brand_logo_${brand.toLowerCase().replace(/ /g,'_')}`)?.value || '';

  const handleUpload = async (brand, file) => {
    if (!file) return;
    const key = `brand_logo_${brand.toLowerCase().replace(/ /g,'_')}`;
    setUploading(u => ({ ...u, [brand]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await saveMutation.mutateAsync({ key, value: file_url });
    setUploading(u => ({ ...u, [brand]: false }));
    toast.success(`${brand} logo updated!`);
  };

  const handleRemoveLogo = async (brand) => {
    const key = `brand_logo_${brand.toLowerCase().replace(/ /g,'_')}`;
    await saveMutation.mutateAsync({ key, value: '' });
    toast.success(`${brand} logo removed.`);
  };

  const handleAddBrand = async () => {
    const name = newBrandName.trim();
    if (!name) { toast.error('Enter a brand name'); return; }
    if (allBrands.map(b => b.toLowerCase()).includes(name.toLowerCase())) {
      toast.error('Brand already exists'); return;
    }
    const updated = [...customBrands, name];
    await saveMutation.mutateAsync({ key: CUSTOM_BRANDS_KEY, value: JSON.stringify(updated) });
    setNewBrandName('');
    setShowAddForm(false);
    toast.success(`${name} added!`);
  };

  const handleDeleteBrand = async (brand) => {
    if (!confirm(`Delete brand "${brand}"? Its logo will also be removed.`)) return;
    // Remove from custom list
    const updated = customBrands.filter(b => b !== brand);
    await saveMutation.mutateAsync({ key: CUSTOM_BRANDS_KEY, value: JSON.stringify(updated) });
    // Also clear logo
    const logoKey = `brand_logo_${brand.toLowerCase().replace(/ /g,'_')}`;
    await saveMutation.mutateAsync({ key: logoKey, value: '' });
    toast.success(`${brand} removed`);
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Shop by Brand — Logo Manager</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" className="gap-1.5 bg-[#1B3A6B] hover:bg-[#152d56] text-white">
          <Plus className="h-4 w-4" /> Add Brand
        </Button>
      </div>
      <p className="text-gray-500 text-sm mb-4">Upload logos for each brand. Custom brands can be fully deleted.</p>

      {showAddForm && (
        <Card className="p-4 mb-5 border-blue-200 bg-blue-50">
          <h3 className="font-bold text-sm text-gray-800 mb-3">Add New Brand</h3>
          <div className="flex gap-2">
            <Input
              value={newBrandName}
              onChange={e => setNewBrandName(e.target.value)}
              placeholder="Brand name e.g. Vivo, Realme, Panasonic..."
              onKeyDown={e => e.key === 'Enter' && handleAddBrand()}
              className="flex-1"
            />
            <Button onClick={handleAddBrand} className="bg-[#1B3A6B] text-white hover:bg-[#152d56]">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {/* Custom brands section */}
      {customBrands.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Custom Brands (can be deleted)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {customBrands.map(brand => (
              <BrandCard
                key={brand}
                brand={brand}
                logo={getLogo(brand)}
                isUploading={uploading[brand]}
                isCustom={true}
                onUpload={(file) => handleUpload(brand, file)}
                onRemoveLogo={() => handleRemoveLogo(brand)}
                onDeleteBrand={() => handleDeleteBrand(brand)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Default brands */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Default Brands</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {DEFAULT_BRANDS.map(brand => (
          <BrandCard
            key={brand}
            brand={brand}
            logo={getLogo(brand)}
            isUploading={uploading[brand]}
            isCustom={false}
            onUpload={(file) => handleUpload(brand, file)}
            onRemoveLogo={() => handleRemoveLogo(brand)}
            onDeleteBrand={null}
          />
        ))}
      </div>
    </div>
  );
}

function BrandCard({ brand, logo, isUploading, isCustom, onUpload, onRemoveLogo, onDeleteBrand }) {
  return (
    <Card className="p-3 flex flex-col items-center gap-2 relative">

      <span className="text-xs font-bold text-gray-700 text-center leading-tight">{brand}</span>
      <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
        {logo
          ? <img src={logo} alt={brand} className="max-w-full max-h-full object-contain p-1" />
          : <ImagePlus className="h-6 w-6 text-gray-300" />}
      </div>
      <label className="cursor-pointer w-full">
        <div className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold w-full transition-colors ${isUploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100'}`}>
          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {isUploading ? 'Uploading...' : logo ? 'Replace' : 'Upload Logo'}
        </div>
        <input type="file" accept="image/*" className="hidden" disabled={isUploading}
          onChange={e => onUpload(e.target.files?.[0])} />
      </label>
      <button
        onClick={onRemoveLogo}
        disabled={!logo}
        className={`text-[11px] flex items-center gap-1 transition-colors ${logo ? 'text-red-400 hover:text-red-600' : 'text-gray-200 cursor-not-allowed'}`}
      >
        <Trash2 className="h-3 w-3" /> Remove Logo
      </button>
      <button
        onClick={onDeleteBrand || (() => {})}
        disabled={!onDeleteBrand}
        className={`text-[10px] flex items-center gap-1 transition-colors px-2 py-0.5 rounded border ${onDeleteBrand ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-gray-300 border-gray-100 cursor-not-allowed'}`}
        title={onDeleteBrand ? 'Remove brand from app' : 'Default brand cannot be removed'}
      >
        <X className="h-3 w-3" /> {onDeleteBrand ? 'Remove Brand' : 'Default'}
      </button>
    </Card>
  );
}