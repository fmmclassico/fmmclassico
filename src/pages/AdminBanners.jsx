import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Sparkles, Eye, EyeOff, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const GRADIENTS = [
  { label: '🔴 Red/Pink', value: 'from-red-600 via-red-500 to-pink-400' },
  { label: '🟠 Orange', value: 'from-orange-600 via-orange-500 to-amber-400' },
  { label: '🟡 Gold', value: 'from-yellow-500 via-amber-500 to-orange-400' },
  { label: '🟢 Green', value: 'from-green-600 via-green-500 to-emerald-400' },
  { label: '🔵 Blue', value: 'from-blue-600 via-blue-500 to-indigo-400' },
  { label: '🟣 Purple', value: 'from-purple-600 via-purple-500 to-pink-400' },
  { label: '⚫ Dark', value: 'from-gray-800 via-gray-700 to-gray-600' },
];

const EMPTY_FORM = {
  title: '', subtitle: '', badge: '', image_url: '',
  bg_gradient: 'from-orange-600 via-orange-500 to-amber-400',
  cta_text: 'Shop Now', cta_link: '', is_active: true, order: 0
};

export default function AdminBanners() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      const auth = await base44.auth.isAuthenticated();
      if (auth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      }
    };
    init();
  }, []);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['promoBanners'],
    queryFn: () => base44.entities.PromoBanner.list('order', 50),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PromoBanner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Banner created!');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.PromoBanner.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promoBanners'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PromoBanner.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
      toast.success('Banner deleted');
    }
  });

  const handleGenerateImage = async () => {
    if (!form.title) { toast.error('Enter a title first'); return; }
    setIsGenerating(true);
    const { url } = await base44.integrations.Core.GenerateImage({
      prompt: `A vibrant, high-quality promotional banner image for an online store in Ghana called FMM CLASSICO. The theme is: "${form.title}". ${form.subtitle || ''}. Colorful, festive, professional e-commerce style. No text overlay.`
    });
    setForm(f => ({ ...f, image_url: url }));
    setIsGenerating(false);
    toast.success('Image generated!');
  };

  if (!user) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  if (!isAdmin) return <div className="text-center py-20 text-red-500 font-semibold">Admin access only.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">🖼️ Promo Banners</h1>
          <p className="text-gray-500 text-sm mt-1">Manage homepage banner slides for promos & festive seasons</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="h-4 w-4 mr-1" /> New Banner
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 mb-6 border-2 border-orange-200 bg-orange-50">
          <h2 className="font-bold text-gray-800 mb-4">Create New Banner</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Badge (e.g. 🎄 Christmas Sale)</Label>
                <Input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="🎉 Special Offer" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Christmas Sale!" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Subtitle</Label>
              <Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Up to 50% off selected products" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Image URL (or generate with AI)</Label>
              <div className="flex gap-2">
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
                <Button type="button" variant="outline" onClick={handleGenerateImage} disabled={isGenerating} className="flex-shrink-0 border-orange-300 text-orange-600">
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>
              {form.image_url && (
                <img src={form.image_url} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
              )}
            </div>
            <div>
              <Label className="text-xs mb-1 block">Background Gradient</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GRADIENTS.map(g => (
                  <button key={g.value} onClick={() => setForm(f => ({ ...f, bg_gradient: g.value }))}
                    className={`text-xs px-2 py-1 rounded-full border transition-all ${form.bg_gradient === g.value ? 'ring-2 ring-orange-500 border-orange-500 font-bold' : 'border-gray-300'}`}>
                    {g.label}
                  </button>
                ))}
              </div>
              <div className={`mt-2 h-8 rounded-lg bg-gradient-to-r ${form.bg_gradient}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">CTA Button Text</Label>
                <Input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="Shop Now" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">CTA Link (page name)</Label>
                <Input value={form.cta_link} onChange={e => setForm(f => ({ ...f, cta_link: e.target.value }))} placeholder="Shop or Shop?category=phones" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.title} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Banner'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
      ) : banners.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No promo banners yet</p>
          <p className="text-sm mt-1">Create your first banner above. Until you post one, the default slides are shown to customers.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {banners.map(banner => (
            <Card key={banner.id} className={`p-4 ${!banner.is_active ? 'opacity-60' : ''}`}>
              <div className="flex gap-3 items-start">
                {banner.image_url && (
                  <img src={banner.image_url} alt={banner.title} className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className={`flex-shrink-0 w-3 h-full rounded-full bg-gradient-to-b ${banner.bg_gradient}`} style={{minHeight: 48}} />
                <div className="flex-1 min-w-0">
                  {banner.badge && <p className="text-xs text-gray-500">{banner.badge}</p>}
                  <p className="font-bold text-gray-800 truncate">{banner.title}</p>
                  {banner.subtitle && <p className="text-xs text-gray-500 truncate">{banner.subtitle}</p>}
                  <Badge className={`mt-1 text-xs ${banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {banner.is_active ? 'Active' : 'Hidden'}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: banner.id, is_active: !banner.is_active })}>
                    {banner.is_active ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm('Delete this banner?')) deleteMutation.mutate(banner.id); }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}