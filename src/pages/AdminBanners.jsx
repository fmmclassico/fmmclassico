import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Sparkles, Eye, EyeOff, Pencil, X, Check } from 'lucide-react';
import { toast } from 'sonner';

const GRADIENTS = [
  { label: '🩵 Teal (Default)', value: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]' },
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
  bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
  cta_text: 'Shop Now', cta_link: '', is_active: true, order: 0
};

const DEFAULT_SLIDES = [
  {
    badge: '🔥 New Arrivals', title: 'Phones & Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: 'https://i.pinimg.com/1200x/99/64/a2/9964a202c67115b1f40714082848c312.jpg',
    cta_link: 'Shop?category=phones', cta_text: 'Shop Now', is_active: true, order: 1,
  },
  {
    badge: '⚡ Best Deals', title: 'Electronic Appliances',
    subtitle: 'Top quality electronics for your everyday needs',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: 'https://m.media-amazon.com/images/I/519qw7On-vL.jpg',
    cta_link: 'Shop?category=electronic_appliances', cta_text: 'Shop Now', is_active: true, order: 2,
  },
  {
    badge: '🏡 Home Deals', title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: 'https://i.pinimg.com/1200x/60/53/2f/60532f215514eb6e5068ec232e1428c1.jpg',
    cta_link: 'Shop?category=home_appliances', cta_text: 'Shop Now', is_active: true, order: 3,
  },
  {
    badge: '📱 Top Brands', title: 'Samsung & Apple',
    subtitle: 'Genuine Samsung & Apple products at great prices',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&q=80',
    cta_link: 'BrandProducts?brand=Samsung', cta_text: 'Shop Brands', is_active: true, order: 4,
  },
  {
    badge: '🎧 Accessories', title: 'Earphones & Speakers',
    subtitle: 'Premium sound at affordable prices — Oraimo, JBL & more',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
    cta_link: 'Shop?category=earphones', cta_text: 'Shop Now', is_active: true, order: 5,
  },
  {
    badge: '⌚ Smart Wear', title: 'Smart Watches',
    subtitle: 'Stay connected with the latest smartwatches',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&q=80',
    cta_link: 'Shop?category=smart_watches', cta_text: 'Shop Now', is_active: true, order: 6,
  },
];

function BannerForm({ initial, onSave, onCancel, isSaving, isNew }) {
  const [form, setForm] = useState(initial);
  const [isGenerating, setIsGenerating] = useState(false);

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

  return (
    <Card className="p-5 mb-4 border-2 border-blue-200 bg-blue-50">
      <h2 className="font-bold text-gray-800 mb-4">{isNew ? 'Create New Banner' : 'Edit Banner'}</h2>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">Badge</Label>
            <Input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="🎉 Special Offer" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Banner Title" />
          </div>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Subtitle</Label>
          <Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Short description..." />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Image URL (paste URL or generate with AI)</Label>
          <div className="flex gap-2">
            <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            <Button type="button" variant="outline" onClick={handleGenerateImage} disabled={isGenerating} className="flex-shrink-0 border-blue-300 text-blue-600">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </div>
          {form.image_url && (
            <img src={form.image_url} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
          )}
        </div>
        <div>
          <Label className="text-xs mb-1 block">Background Color</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {GRADIENTS.map(g => (
              <button key={g.value} onClick={() => setForm(f => ({ ...f, bg_gradient: g.value }))}
                className={`text-xs px-2 py-1 rounded-full border transition-all ${form.bg_gradient === g.value ? 'ring-2 ring-blue-500 border-blue-500 font-bold' : 'border-gray-300'}`}>
                {g.label}
              </button>
            ))}
          </div>
          <div className={`mt-2 h-8 rounded-lg bg-gradient-to-r ${form.bg_gradient}`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">Button Text</Label>
            <Input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="Shop Now" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Button Link (page name)</Label>
            <Input value={form.cta_link} onChange={e => setForm(f => ({ ...f, cta_link: e.target.value }))} placeholder="Shop?category=phones" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={() => onSave(form)} disabled={isSaving || !form.title} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> {isNew ? 'Create Banner' : 'Save Changes'}</>}
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1"><X className="h-4 w-4 mr-1" /> Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

export default function AdminBanners() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [seeding, setSeeding] = useState(false);
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
      setShowCreateForm(false);
      toast.success('Banner created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PromoBanner.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
      setEditingId(null);
      toast.success('Banner updated!');
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

  const handleSeedDefaults = async () => {
    setSeeding(true);
    for (const slide of DEFAULT_SLIDES) {
      await base44.entities.PromoBanner.create(slide);
    }
    queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
    setSeeding(false);
    toast.success('All 6 default slides added!');
  };

  if (!user) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (!isAdmin) return <div className="text-center py-20 text-red-500 font-semibold">Admin access only.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-black text-gray-800">🖼️ Hero Banner Slides</h1>
          <p className="text-gray-500 text-sm mt-1">Control all 6 homepage banner slides — edit, hide, or delete any slide</p>
        </div>
        <Button onClick={() => { setShowCreateForm(s => !s); setEditingId(null); }} className="bg-[#2E86C1] hover:bg-[#2578ae] text-white">
          <Plus className="h-4 w-4 mr-1" /> New Slide
        </Button>
      </div>

      {banners.length === 0 && !isLoading && (
        <Card className="p-5 mb-5 border-dashed border-2 border-gray-300 text-center">
          <p className="text-gray-600 font-semibold mb-1">No slides in database yet</p>
          <p className="text-gray-400 text-sm mb-3">The app is currently showing the built-in default slides. Click below to load all 6 into the database so you can edit them.</p>
          <Button onClick={handleSeedDefaults} disabled={seeding} className="bg-[#2E86C1] hover:bg-[#2578ae] text-white">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Load All 6 Default Slides for Editing
          </Button>
        </Card>
      )}

      {showCreateForm && (
        <BannerForm
          initial={EMPTY_FORM}
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowCreateForm(false)}
          isSaving={createMutation.isPending}
          isNew
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, idx) => (
            <div key={banner.id}>
              {editingId === banner.id ? (
                <BannerForm
                  initial={{ ...banner }}
                  onSave={(data) => updateMutation.mutate({ id: banner.id, data })}
                  onCancel={() => setEditingId(null)}
                  isSaving={updateMutation.isPending}
                  isNew={false}
                />
              ) : (
                <Card className={`p-4 transition-opacity ${!banner.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex gap-3 items-center">
                    <span className="text-gray-400 font-bold text-sm w-5 text-center">{idx + 1}</span>
                    {banner.image_url && (
                      <img src={banner.image_url} alt={banner.title} className="w-16 h-14 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className={`flex-shrink-0 w-2 self-stretch rounded-full bg-gradient-to-b ${banner.bg_gradient}`} />
                    <div className="flex-1 min-w-0">
                      {banner.badge && <p className="text-xs text-gray-400">{banner.badge}</p>}
                      <p className="font-bold text-gray-800 truncate">{banner.title}</p>
                      {banner.subtitle && <p className="text-xs text-gray-500 truncate">{banner.subtitle}</p>}
                      <Badge className={`mt-1 text-xs ${banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {banner.is_active ? '👁 Visible' : '🙈 Hidden'}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(banner.id); setShowCreateForm(false); }}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: banner.id, is_active: !banner.is_active })}>
                        {banner.is_active ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-green-600" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm('Delete this slide?')) deleteMutation.mutate(banner.id); }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}