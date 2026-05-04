import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// 6 promo card slots
const BANNER_KEYS = ['promo_card_1','promo_card_2','promo_card_3','promo_card_4','promo_card_5','promo_card_6'];

const POSITION_OPTIONS = [
  { value: 'front', label: '🥇 Front (first)' },
  { value: 'middle', label: '🥈 Middle' },
  { value: 'back', label: '🥉 Back (last)' },
];

const GRADIENT_OPTIONS = [
  { value: 'from-blue-600 to-blue-400', label: 'Blue' },
  { value: 'from-orange-600 to-orange-400', label: 'Orange' },
  { value: 'from-green-600 to-green-400', label: 'Green' },
  { value: 'from-purple-600 to-purple-400', label: 'Purple' },
  { value: 'from-red-600 to-red-400', label: 'Red' },
  { value: 'from-pink-600 to-pink-400', label: 'Pink' },
  { value: 'from-yellow-500 to-yellow-300', label: 'Yellow' },
  { value: 'from-gray-800 to-gray-600', label: 'Dark' },
];

function defaultBanner() {
  return { active: false, image_url: '', title: '', subtitle: '', description: '', cta_text: 'Shop Now', link: '', gradient: 'from-blue-600 to-blue-400', position: 'back' };
}

export default function AdminPromoBanners2() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState({});
  const [localData, setLocalData] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setIsAdmin(u?.role === 'admin'); }).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
    enabled: isAdmin,
  });

  const getVal = (key) => {
    const raw = settings.find(s => s.key === key)?.value;
    if (!raw) return defaultBanner();
    try { return { ...defaultBanner(), ...JSON.parse(raw) }; } catch { return defaultBanner(); }
  };

  // Sync localData from settings when loaded
  useEffect(() => {
    if (!settings.length) return;
    const init = {};
    BANNER_KEYS.forEach(k => { init[k] = getVal(k); });
    setLocalData(init);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = settings.find(s => s.key === key);
      const serialized = JSON.stringify(value);
      if (existing) return base44.entities.AppSetting.update(existing.id, { value: serialized });
      return base44.entities.AppSetting.create({ key, value: serialized });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appSettings'] }),
  });

  const handleSave = async (key) => {
    const data = localData[key] || defaultBanner();
    await saveMutation.mutateAsync({ key, value: data });
    toast.success('Banner saved!');
  };

  const handleUpload = async (key, file) => {
    if (!file) return;
    setUploading(u => ({ ...u, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = { ...(localData[key] || defaultBanner()), image_url: file_url };
    setLocalData(d => ({ ...d, [key]: updated }));
    await saveMutation.mutateAsync({ key, value: updated });
    setUploading(u => ({ ...u, [key]: false }));
    toast.success('Image uploaded!');
  };

  const handleToggle = async (key) => {
    const current = localData[key] || defaultBanner();
    const updated = { ...current, active: !current.active };
    setLocalData(d => ({ ...d, [key]: updated }));
    await saveMutation.mutateAsync({ key, value: updated });
    toast.success(updated.active ? 'Banner is now LIVE!' : 'Banner hidden.');
  };

  const handleField = (key, field, val) => {
    setLocalData(d => ({ ...d, [key]: { ...(d[key] || defaultBanner()), [field]: val } }));
  };

  const handleClear = async (key) => {
    if (!confirm('Clear this banner slot?')) return;
    const cleared = defaultBanner();
    setLocalData(d => ({ ...d, [key]: cleared }));
    await saveMutation.mutateAsync({ key, value: cleared });
    toast.success('Banner cleared.');
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Promo Banner Cards</h1>
      <p className="text-gray-500 text-sm mb-2">Manage up to 6 promo cards that appear on the homepage scroll carousel. Each card has a title, description, image, button text, and position (front/middle/back).</p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700 mb-6 font-medium">
        💡 Active cards appear in the homepage category scroll alongside Phones & Accessories, Electronics, and Home Appliances cards. Set <strong>position</strong> to control where they appear in the scroll.
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {BANNER_KEYS.map((key, idx) => {
          const data = localData[key] || defaultBanner();
          const isUploading = uploading[key];

          return (
            <Card key={key} className={`p-4 border-2 transition-all ${data.active ? 'border-[#2E86C1] shadow-md' : 'border-gray-200'}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700 text-sm">Promo Card {idx + 1}</span>
                  <Badge className={data.active ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'}>
                    {data.active ? '🟢 Live' : '⚫ Hidden'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {(data.image_url || data.title) && (
                    <button onClick={() => handleClear(key)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="text-xs text-gray-400">{data.active ? 'ON' : 'OFF'}</span>
                  <Switch checked={data.active} onCheckedChange={() => handleToggle(key)} />
                </div>
              </div>

              {/* Image preview + upload */}
              <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mb-3 flex items-center justify-center" style={{ aspectRatio: '16/7', minHeight: 90 }}>
                {data.image_url ? (
                  <img src={data.image_url} alt="Promo" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-gradient-to-r ${data.gradient || 'from-blue-600 to-blue-400'}`}>
                    <div className="text-white text-center px-3">
                      <p className="font-bold text-sm">{data.title || 'Card Preview'}</p>
                      {data.subtitle && <p className="text-xs opacity-80">{data.subtitle}</p>}
                    </div>
                  </div>
                )}
              </div>

              <label className="cursor-pointer block mb-3">
                <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full ${isUploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100'}`}>
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {isUploading ? 'Uploading...' : data.image_url ? 'Replace Image' : 'Upload Background Image'}
                </div>
                <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                  onChange={e => handleUpload(key, e.target.files?.[0])} />
              </label>

              {/* Text fields */}
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-500 mb-0.5 block">Title (emoji ok)</Label>
                  <Input value={data.title || ''} onChange={e => handleField(key, 'title', e.target.value)}
                    placeholder="🔥 New Arrivals" className="text-sm h-8" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-0.5 block">Subtitle / Category</Label>
                  <Input value={data.subtitle || ''} onChange={e => handleField(key, 'subtitle', e.target.value)}
                    placeholder="Phones & Accessories" className="text-sm h-8" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-0.5 block">Description</Label>
                  <Textarea value={data.description || ''} onChange={e => handleField(key, 'description', e.target.value)}
                    placeholder="Cases, chargers, earphones & more at unbeatable prices"
                    className="text-sm resize-none" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-0.5 block">Button Text</Label>
                    <Input value={data.cta_text || ''} onChange={e => handleField(key, 'cta_text', e.target.value)}
                      placeholder="Shop Now" className="text-sm h-8" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-0.5 block">Link</Label>
                    <Input value={data.link || ''} onChange={e => handleField(key, 'link', e.target.value)}
                      placeholder="/Shop" className="text-sm h-8" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-0.5 block">Background Color</Label>
                    <Select value={data.gradient || 'from-blue-600 to-blue-400'} onValueChange={v => handleField(key, 'gradient', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADIENT_OPTIONS.map(g => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-0.5 block">Position in scroll</Label>
                    <Select value={data.position || 'back'} onValueChange={v => handleField(key, 'position', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITION_OPTIONS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSave(key)} className="w-full mt-3 h-8 text-xs bg-[#2E86C1] hover:bg-[#2578ae]">
                Save Card {idx + 1}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}