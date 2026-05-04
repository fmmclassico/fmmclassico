import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BRANDS = ['Apple','Samsung','Tecno','Hisense','TCL','Oraimo','Sony','JBL','Infinix','Itel','Xiaomi','LG','Midea','Nasco','Roch','Hoffman','Silver Crest'];

export default function AdminBrandLogos() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
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

  const handleDelete = async (brand) => {
    const key = `brand_logo_${brand.toLowerCase().replace(/ /g,'_')}`;
    await saveMutation.mutateAsync({ key, value: '' });
    toast.success(`${brand} logo removed.`);
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Shop by Brand — Logo Manager</h1>
      <p className="text-gray-500 text-sm mb-6">Upload custom logos for each brand. These will appear in the "Shop by Brand" section on the homepage. If no logo is uploaded, the default/fallback is used.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {BRANDS.map(brand => {
          const logo = getLogo(brand);
          const isUploading = uploading[brand];
          return (
            <Card key={brand} className="p-3 flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-gray-700">{brand}</span>
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
                  onChange={e => handleUpload(brand, e.target.files?.[0])} />
              </label>
              {logo && (
                <button onClick={() => handleDelete(brand)} className="text-[11px] text-red-400 hover:text-red-600 flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}