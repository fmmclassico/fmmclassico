import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Check, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_KEYS = [
  { key: 'cat_img_phones', label: 'Phones', desc: 'Image for the Phones category card' },
  { key: 'cat_img_phone_accessories', label: 'Phone Accessories', desc: 'Image for the Phone Accessories category card' },
  { key: 'cat_img_electronics', label: 'Electronics', desc: 'Image for the Electronics category card' },
  { key: 'cat_img_home_appliances', label: 'Home Appliances', desc: 'Image for the Home Appliances category card' },
];

export default function AdminCategoryImages() {
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

  const getVal = (key) => settings.find(s => s.key === key)?.value || '';
  const getId = (key) => settings.find(s => s.key === key)?.id;

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = settings.find(s => s.key === key);
      if (existing) return base44.entities.AppSetting.update(existing.id, { value });
      return base44.entities.AppSetting.create({ key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Category image updated!');
    },
  });

  const handleUpload = async (key, file) => {
    if (!file) return;
    setUploading(u => ({ ...u, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await saveMutation.mutateAsync({ key, value: file_url });
    setUploading(u => ({ ...u, [key]: false }));
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Category Background Images</h1>
      <p className="text-gray-500 text-sm mb-6">Upload custom images for each category card shown on the homepage.</p>

      <div className="grid md:grid-cols-2 gap-5">
        {CATEGORY_KEYS.map(({ key, label, desc }) => {
          const currentImg = getVal(key);
          const isUploading = uploading[key];
          return (
            <Card key={key} className="p-4">
              <Label className="font-semibold text-gray-800 block mb-1">{label}</Label>
              <p className="text-xs text-gray-400 mb-3">{desc}</p>
              <div className="w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 mb-3 flex items-center justify-center">
                {currentImg
                  ? <img src={currentImg} alt={label} className="w-full h-full object-cover" />
                  : <ImagePlus className="h-8 w-8 text-gray-300" />}
              </div>
              <label className="cursor-pointer block">
                <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors w-full ${isUploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100'}`}>
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isUploading ? 'Uploading...' : 'Upload New Image'}
                </div>
                <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                  onChange={e => handleUpload(key, e.target.files?.[0])} />
              </label>
            </Card>
          );
        })}
      </div>
    </div>
  );
}