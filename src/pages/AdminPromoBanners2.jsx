import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Upload, Loader2, ImagePlus, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

// These are the 2 dedicated "notice banner" slots (distinct from the hero slider)
const BANNER_KEYS = ['promo_notice_1', 'promo_notice_2'];

export default function AdminPromoBanners2() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setIsAdmin(u?.role === 'admin'); }).catch(() => {});
  }, []);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
    enabled: isAdmin,
  });

  const getVal = (key) => {
    const raw = settings.find(s => s.key === key)?.value;
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = settings.find(s => s.key === key);
      const serialized = JSON.stringify(value);
      if (existing) return base44.entities.AppSetting.update(existing.id, { value: serialized });
      return base44.entities.AppSetting.create({ key, value: serialized });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Banner updated!');
    },
  });

  const handleUpload = async (key, file) => {
    if (!file) return;
    setUploading(u => ({ ...u, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const current = getVal(key) || { image_url: '', active: false, link: '' };
    await saveMutation.mutateAsync({ key, value: { ...current, image_url: file_url } });
    setUploading(u => ({ ...u, [key]: false }));
  };

  const toggleActive = async (key) => {
    const current = getVal(key) || { image_url: '', active: false, link: '' };
    if (!current.image_url) { toast.error('Upload an image first'); return; }
    await saveMutation.mutateAsync({ key, value: { ...current, active: !current.active } });
  };

  const clearBanner = async (key) => {
    if (!confirm('Clear this banner slot?')) return;
    await saveMutation.mutateAsync({ key, value: { image_url: '', active: false, link: '' } });
  };

  const updateLink = async (key, link) => {
    const current = getVal(key) || { image_url: '', active: false, link: '' };
    await saveMutation.mutateAsync({ key, value: { ...current, link } });
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Promo Notice Banners</h1>
      <p className="text-gray-500 text-sm mb-2">Upload promo/sale flyer images for the 2 notice banner slots on the homepage. Toggle them ON to make them visible to users. When OFF, users see a clean homepage.</p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700 mb-6 font-medium">
        💡 These banners appear above the main hero slider only when you activate them. Perfect for flash sales, special promotions, or event announcements.
      </div>

      <div className="space-y-6">
        {BANNER_KEYS.map((key, idx) => {
          const data = getVal(key);
          const isUploading = uploading[key];
          const hasImage = !!data?.image_url;
          const isActive = !!data?.active;

          return (
            <Card key={key} className={`p-5 border-2 transition-all ${isActive ? 'border-green-400 shadow-md' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-800">Banner Slot {idx + 1}</h2>
                  <Badge className={isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500'}>
                    {isActive ? '🟢 Live — Visible to users' : '⚫ Hidden'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {hasImage && (
                    <button onClick={() => clearBanner(key)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">{isActive ? 'ON' : 'OFF'}</span>
                    <Switch checked={isActive} onCheckedChange={() => toggleActive(key)} />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mb-3 flex items-center justify-center" style={{ aspectRatio: '3/1', minHeight: 120 }}>
                {hasImage
                  ? <img src={data.image_url} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
                  : (
                    <div className="flex flex-col items-center text-gray-300 py-6">
                      <ImagePlus className="h-8 w-8 mb-1" />
                      <p className="text-xs">No image uploaded</p>
                    </div>
                  )}
              </div>

              <div className="flex gap-2">
                <label className="cursor-pointer flex-1">
                  <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isUploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100'}`}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isUploading ? 'Uploading...' : hasImage ? 'Replace Image' : 'Upload Banner Image'}
                  </div>
                  <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                    onChange={e => handleUpload(key, e.target.files?.[0])} />
                </label>
              </div>

              {hasImage && (
                <div className="mt-3">
                  <Label className="text-xs text-gray-500 mb-1 block">Link when clicked (optional)</Label>
                  <Input
                    placeholder="e.g. /Shop?category=phones or https://..."
                    defaultValue={data?.link || ''}
                    onBlur={e => updateLink(key, e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}