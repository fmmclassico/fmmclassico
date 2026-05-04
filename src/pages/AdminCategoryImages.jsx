import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, ImagePlus, ChevronLeft, ChevronRight, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_KEYS = [
  { key: 'cat_img_phones', label: 'Phones', desc: 'Image for the Phones category card' },
  { key: 'cat_img_phone_accessories', label: 'Phone Accessories', desc: 'Image for the Phone Accessories category card' },
  { key: 'cat_img_electronics', label: 'Electronics', desc: 'Image for the Electronics category card' },
  { key: 'cat_img_home_appliances', label: 'Home Appliances', desc: 'Image for the Home Appliances category card' },
];

// history stored as JSON array in AppSetting key: cat_img_history_<key>
function CategoryCard({ catKey, label, desc, settings, saveMutation, queryClient }) {
  const [uploading, setUploading] = useState(false);

  const getVal = (k) => settings.find(s => s.key === k)?.value || '';
  const getHistory = (k) => {
    const raw = getVal(`cat_img_history_${k}`);
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
  };

  const currentImg = getVal(catKey);
  const history = getHistory(catKey);

  const saveHistory = async (newHistory) => {
    const existing = settings.find(s => s.key === `cat_img_history_${catKey}`);
    const value = JSON.stringify(newHistory);
    if (existing) return base44.entities.AppSetting.update(existing.id, { value });
    return base44.entities.AppSetting.create({ key: `cat_img_history_${catKey}`, value });
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    // save old image to history
    const newHistory = currentImg ? [currentImg, ...history.filter(h => h !== file_url)].slice(0, 10) : history;
    await Promise.all([
      saveMutation.mutateAsync({ key: catKey, value: file_url }),
      saveHistory(newHistory),
    ]);
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setUploading(false);
    toast.success(`${label} image updated!`);
  };

  const handleGoBack = async () => {
    if (!history.length) return toast.error('No previous image to go back to.');
    const [prev, ...rest] = history;
    const oldCurrent = currentImg;
    const newHistory = oldCurrent ? [oldCurrent, ...rest] : rest;
    await Promise.all([
      saveMutation.mutateAsync({ key: catKey, value: prev }),
      saveHistory(newHistory),
    ]);
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    toast.success('Restored previous image.');
  };

  const handleDelete = async () => {
    if (!confirm('Remove this image? The category will show the default.')) return;
    const newHistory = history.filter(h => h !== currentImg);
    await Promise.all([
      saveMutation.mutateAsync({ key: catKey, value: '' }),
      saveHistory(newHistory),
    ]);
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    toast.success('Image removed.');
  };

  return (
    <Card className="p-4">
      <Label className="font-semibold text-gray-800 block mb-0.5">{label}</Label>
      <p className="text-xs text-gray-400 mb-3">{desc}</p>

      {/* Image Preview */}
      <div className="w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 mb-3 flex items-center justify-center relative">
        {currentImg
          ? <img src={currentImg} alt={label} className="w-full h-full object-cover" style={{ imageRendering: 'high-quality' }} />
          : <ImagePlus className="h-8 w-8 text-gray-300" />}
        {history.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
            {history.length} prev
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap mb-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleGoBack} disabled={!history.length}>
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs text-green-700 border-green-300 hover:bg-green-50" disabled={!currentImg}>
          <Check className="h-3.5 w-3.5" /> Keep Current
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-600 border-red-300 hover:bg-red-50" onClick={handleDelete} disabled={!currentImg}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {/* Upload */}
      <label className="cursor-pointer block">
        <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors w-full ${uploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100'}`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading...' : 'Upload New Image'}
        </div>
        <input type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={e => handleUpload(e.target.files?.[0])} />
      </label>
    </Card>
  );
}

export default function AdminCategoryImages() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
  });

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Category Background Images</h1>
      <p className="text-gray-500 text-sm mb-6">Upload and manage images for each category card. Use the Previous button to go back, Delete to remove, or Keep to confirm the current image.</p>

      <div className="grid md:grid-cols-2 gap-5">
        {CATEGORY_KEYS.map(({ key, label, desc }) => (
          <CategoryCard
            key={key}
            catKey={key}
            label={label}
            desc={desc}
            settings={settings}
            saveMutation={saveMutation}
            queryClient={queryClient}
          />
        ))}
      </div>
    </div>
  );
}