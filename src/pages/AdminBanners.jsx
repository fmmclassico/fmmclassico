import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Eye, EyeOff, Pencil, X, Check, Upload, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const MAIN_CATEGORY_OPTIONS = [
  { label: 'Phones', value: 'phones', route: '/phones' },
  { label: 'Phone Accessories', value: 'phone-accessories', route: '/phone-accessories' },
  { label: 'Home Appliances', value: 'home-appliances', route: '/home-appliances' },
  { label: 'Electronics', value: 'electronics', route: '/electronics' },
];

const SHOP_CATEGORY_OPTIONS = [
  { label: 'Phones', value: 'phones' },
  { label: 'Phone Accessories', value: 'phone_cases' },
  { label: 'Home Appliances', value: 'home_appliances' },
  { label: 'Electronics', value: 'electronic_appliances' },
];

const SHOP_CATEGORY_TO_MAIN_SLUG = {
  phones: 'phones',
  phone_cases: 'phone-accessories',
  chargers: 'phone-accessories',
  earphones: 'phone-accessories',
  cables: 'phone-accessories',
  power_banks: 'phone-accessories',
  screen_protectors: 'phone-accessories',
  holders: 'phone-accessories',
  speakers: 'phone-accessories',
  smart_watches: 'electronics',
  electronic_appliances: 'electronics',
  home_appliances: 'home-appliances',
};

const PAGE_OPTIONS = [
  { label: 'Home', value: '/' },
  { label: 'Categories', value: '/Categories' },
  { label: 'Shop', value: '/Shop' },
  { label: 'About', value: '/About' },
  { label: 'How To Use', value: '/HowToUse' },
  { label: 'Policies', value: '/Policies' },
  { label: 'Chat', value: '/Chat' },
  { label: 'Custom Route', value: '__custom__' },
];

const EMPTY_FORM = {
  image_url: '',
  desktop_image_url: '',
  mobile_image_url: '',
  destinationType: 'main_category',
  mainCategory: 'phones',
  brandName: '',
  subCategoryParent: 'phone_cases',
  subCategoryName: '',
  pageChoice: '/',
  customPageRoute: '',
  externalUrl: '',
  order: 0,
  is_active: true,
};

function normalizeQueryResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function normalizeRoute(route) {
  if (!route || !String(route).trim()) return '';
  const safeRoute = String(route).trim();
  return safeRoute.startsWith('/') ? safeRoute : `/${safeRoute}`;
}

function buildBannerLink(form) {
  switch (form.destinationType) {
    case 'main_category': {
      const match = MAIN_CATEGORY_OPTIONS.find((item) => item.value === form.mainCategory);
      return match?.route || `/${encodeURIComponent(form.mainCategory)}`;
    }
    case 'brand':
      return form.brandName.trim() ? `/BrandProducts?brand=${encodeURIComponent(form.brandName.trim())}` : '';
    case 'sub_category':
      return form.subCategoryName.trim()
        ? `/Shop?category=${encodeURIComponent(form.subCategoryParent)}&sub=${encodeURIComponent(form.subCategoryName.trim())}`
        : '';
    case 'page':
      return form.pageChoice === '__custom__' ? normalizeRoute(form.customPageRoute) : form.pageChoice;
    case 'external':
      return form.externalUrl.trim();
    default:
      return '';
  }
}

function destinationSummary(form) {
  switch (form.destinationType) {
    case 'main_category': {
      const match = MAIN_CATEGORY_OPTIONS.find((item) => item.value === form.mainCategory);
      return match?.label || 'Main Category';
    }
    case 'brand':
      return form.brandName ? `Brand: ${form.brandName}` : 'Brand';
    case 'sub_category': {
      const match = SHOP_CATEGORY_OPTIONS.find((item) => item.value === form.subCategoryParent);
      return form.subCategoryName ? `Subcategory: ${form.subCategoryName} (${match?.label || 'Main Category'})` : 'Subcategory';
    }
    case 'page':
      return form.pageChoice === '__custom__' ? `Page: ${normalizeRoute(form.customPageRoute) || '/'}` : `Page: ${form.pageChoice}`;
    case 'external':
      return form.externalUrl ? `External: ${form.externalUrl}` : 'External Link';
    default:
      return 'Destination';
  }
}

function parseStoredLink(link) {
  const safeLink = String(link || '').trim();
  if (!safeLink) return { ...EMPTY_FORM };
  if (/^https?:\/\//i.test(safeLink)) return { ...EMPTY_FORM, destinationType: 'external', externalUrl: safeLink };

  const cleaned = safeLink.startsWith('/') ? safeLink.slice(1) : safeLink;
  if (cleaned.startsWith('BrandProducts?brand=')) {
    const params = new URLSearchParams(cleaned.split('?')[1] || '');
    return { ...EMPTY_FORM, destinationType: 'brand', brandName: decodeURIComponent(params.get('brand') || '') };
  }

  const matchingMainCategory = MAIN_CATEGORY_OPTIONS.find((item) => item.route === safeLink);
  if (matchingMainCategory) return { ...EMPTY_FORM, destinationType: 'main_category', mainCategory: matchingMainCategory.value };

  if (cleaned.startsWith('Shop?category=')) {
    const params = new URLSearchParams(cleaned.split('?')[1] || '');
    const category = params.get('category') || 'phones';
    const sub = params.get('sub') || '';
    if (sub) {
      return { ...EMPTY_FORM, destinationType: 'sub_category', subCategoryParent: category, subCategoryName: decodeURIComponent(sub) };
    }
    return { ...EMPTY_FORM, destinationType: 'main_category', mainCategory: SHOP_CATEGORY_TO_MAIN_SLUG[category] || 'phones' };
  }

  if (safeLink === '/' || PAGE_OPTIONS.some((item) => item.value === safeLink)) return { ...EMPTY_FORM, destinationType: 'page', pageChoice: safeLink };
  if (safeLink.startsWith('/')) return { ...EMPTY_FORM, destinationType: 'page', pageChoice: '__custom__', customPageRoute: safeLink };
  return { ...EMPTY_FORM, destinationType: 'page', pageChoice: '__custom__', customPageRoute: `/${safeLink}` };
}

function ImageUploadButton({ label, imageUrl, onUpload, icon }) {
  const [uploading, setUploading] = useState(false);
  const Icon = icon;

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUpload(file_url);
      toast.success(`${label} uploaded`);
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <label className="cursor-pointer block">
      <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold w-full transition-colors ${uploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100'}`}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        {uploading ? 'Uploading...' : imageUrl ? `Replace ${label}` : `Upload ${label}`}
      </div>
      <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleChange} />
    </label>
  );
}

function DestinationFields({ form, setForm }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs mb-1 block">Where should users go when they click this flyer?</Label>
        <Select value={form.destinationType} onValueChange={(value) => setForm((prev) => ({ ...prev, destinationType: value }))}>
          <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Choose destination type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="main_category">Main Category</SelectItem>
            <SelectItem value="brand">Brand</SelectItem>
            <SelectItem value="sub_category">Sub Category</SelectItem>
            <SelectItem value="page">Certain Page</SelectItem>
            <SelectItem value="external">External Link</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.destinationType === 'main_category' && (
        <div>
          <Label className="text-xs mb-1 block">Choose Main Category</Label>
          <Select value={form.mainCategory} onValueChange={(value) => setForm((prev) => ({ ...prev, mainCategory: value }))}>
            <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Choose category" /></SelectTrigger>
            <SelectContent>
              {MAIN_CATEGORY_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {form.destinationType === 'brand' && (
        <div>
          <Label className="text-xs mb-1 block">Brand Name</Label>
          <Input value={form.brandName} onChange={(e) => setForm((prev) => ({ ...prev, brandName: e.target.value }))} placeholder="Example: Samsung" />
        </div>
      )}

      {form.destinationType === 'sub_category' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">Main Category</Label>
            <Select value={form.subCategoryParent} onValueChange={(value) => setForm((prev) => ({ ...prev, subCategoryParent: value }))}>
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Choose parent category" /></SelectTrigger>
              <SelectContent>
                {SHOP_CATEGORY_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Sub Category Name</Label>
            <Input value={form.subCategoryName} onChange={(e) => setForm((prev) => ({ ...prev, subCategoryName: e.target.value }))} placeholder="Example: Rice Cookers or Phone Cases" />
          </div>
        </>
      )}

      {form.destinationType === 'page' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">Choose Page</Label>
            <Select value={form.pageChoice} onValueChange={(value) => setForm((prev) => ({ ...prev, pageChoice: value }))}>
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Choose page" /></SelectTrigger>
              <SelectContent>
                {PAGE_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.pageChoice === '__custom__' && (
            <div>
              <Label className="text-xs mb-1 block">Custom Route</Label>
              <Input value={form.customPageRoute} onChange={(e) => setForm((prev) => ({ ...prev, customPageRoute: e.target.value }))} placeholder="Example: /Policies" />
            </div>
          )}
        </>
      )}

      {form.destinationType === 'external' && (
        <div>
          <Label className="text-xs mb-1 block">External Link</Label>
          <Input value={form.externalUrl} onChange={(e) => setForm((prev) => ({ ...prev, externalUrl: e.target.value }))} placeholder="https://..." />
        </div>
      )}
    </div>
  );
}

function BannerForm({ initial, onSave, onCancel, isSaving, isNew }) {
  const [form, setForm] = useState(initial);

  const handleSubmit = () => {
    const ctaLink = buildBannerLink(form);
    const fallbackImage = form.desktop_image_url || form.mobile_image_url || form.image_url;

    if (!fallbackImage) {
      toast.error('Upload at least one flyer image first');
      return;
    }
    if (!ctaLink) {
      toast.error('Choose where users should go');
      return;
    }

    onSave({
      title: destinationSummary(form),
      image_url: fallbackImage,
      desktop_image_url: form.desktop_image_url || fallbackImage,
      mobile_image_url: form.mobile_image_url || fallbackImage,
      cta_link: ctaLink,
      order: Number(form.order || 0),
      is_active: form.is_active !== false,
    });
  };

  return (
    <Card className="p-5 mb-4 border-2 border-blue-200 bg-blue-50">
      <h2 className="font-bold text-gray-800 mb-4">{isNew ? 'Create Flyer' : 'Edit Flyer'}</h2>

      <div className="space-y-4">
        <div className="rounded-xl border border-blue-200 bg-white p-3 text-xs text-gray-700">
          <p className="font-semibold text-gray-900 mb-1">Recommended strategy</p>
          <p>Upload <strong>two separate flyers</strong> for the same banner:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>Desktop:</strong> around <strong>1600 x 520 px</strong></li>
            <li><strong>Mobile:</strong> around <strong>1080 x 640 px</strong></li>
          </ul>
          <p className="mt-2">This gives a cleaner fit than forcing one flyer to work on both screens.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs mb-1 block">Desktop Flyer</Label>
            <ImageUploadButton label="Desktop Flyer" imageUrl={form.desktop_image_url || form.image_url} onUpload={(url) => setForm((prev) => ({ ...prev, desktop_image_url: url, image_url: prev.image_url || url }))} icon={Monitor} />
            {(form.desktop_image_url || form.image_url) && <img src={form.desktop_image_url || form.image_url} alt="desktop preview" className="mt-2 h-24 w-full object-cover rounded-lg border" />}
          </div>
          <div>
            <Label className="text-xs mb-1 block">Mobile Flyer</Label>
            <ImageUploadButton label="Mobile Flyer" imageUrl={form.mobile_image_url || form.image_url} onUpload={(url) => setForm((prev) => ({ ...prev, mobile_image_url: url, image_url: prev.image_url || url }))} icon={Smartphone} />
            {(form.mobile_image_url || form.image_url) && <img src={form.mobile_image_url || form.image_url} alt="mobile preview" className="mt-2 h-24 w-full object-cover rounded-lg border" />}
          </div>
        </div>

        <DestinationFields form={form} setForm={setForm} />

        <div>
          <Label className="text-xs mb-1 block">Display Order</Label>
          <Input type="number" value={form.order} onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))} placeholder="0" />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={form.is_active !== false} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
          Show this flyer on the hero banner
        </label>

        <div className="rounded-lg border bg-white px-3 py-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-800">Preview destination:</span> {destinationSummary(form)}
          <div className="mt-1 break-all text-[11px] text-blue-700">{buildBannerLink(form) || 'Ã¢â‚¬â€'}</div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSubmit} disabled={isSaving} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> {isNew ? 'Create Flyer' : 'Save Changes'}</>}
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
  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      try {
        const auth = await base44.auth.isAuthenticated();
        if (!auth) return;
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData?.role === 'admin');
      } catch {}
    };
    init();
  }, []);

  const { data: promoBanners = [], isLoading } = useQuery({
    queryKey: ['promoBanners'],
    queryFn: async () => {
      const result = await base44.entities.PromoBanner.list('order', 500);
      return normalizeQueryResult(result);
    },
    enabled: isAdmin,
    staleTime: 60 * 1000,
  });

  const safeBanners = useMemo(() => {
    return (Array.isArray(promoBanners) ? promoBanners : []).slice().sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0));
  }, [promoBanners]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PromoBanner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
      setShowCreateForm(false);
      toast.success('Flyer created');
    },
    onError: () => toast.error('Could not create flyer'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PromoBanner.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
      setEditingId(null);
      toast.success('Flyer updated');
    },
    onError: () => toast.error('Could not update flyer'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.PromoBanner.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promoBanners'] }),
    onError: () => toast.error('Could not update flyer visibility'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PromoBanner.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoBanners'] });
      toast.success('Flyer deleted');
    },
    onError: () => toast.error('Could not delete flyer'),
  });

  if (!user) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (!isAdmin) return <div className="text-center py-20 text-red-500 font-semibold">Admin access only.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Hero Flyers</h1>
          <p className="text-gray-500 text-sm mt-1">Use separate desktop and mobile flyers for the cleanest hero banner result.</p>
        </div>
        <Button onClick={() => { setShowCreateForm((prev) => !prev); setEditingId(null); }} className="bg-[#2E86C1] hover:bg-[#2578ae] text-white">
          <Plus className="h-4 w-4 mr-1" /> New Flyer
        </Button>
      </div>

      {showCreateForm && (
        <BannerForm
          initial={{ ...EMPTY_FORM, order: safeBanners.length + 1 }}
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowCreateForm(false)}
          isSaving={createMutation.isPending}
          isNew
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : safeBanners.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-2 border-gray-300">
          <p className="font-semibold text-gray-700">No flyers yet</p>
          <p className="text-sm text-gray-500 mt-1">Create your first responsive hero flyer above.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {safeBanners.map((banner, index) => {
            const parsed = {
              ...EMPTY_FORM,
              ...parseStoredLink(banner.cta_link),
              image_url: banner.image_url || '',
              desktop_image_url: banner.desktop_image_url || banner.image_url || '',
              mobile_image_url: banner.mobile_image_url || banner.image_url || '',
              order: Number(banner.order ?? index + 1),
              is_active: banner.is_active !== false,
            };

            if (editingId === banner.id) {
              return <BannerForm key={banner.id} initial={parsed} onSave={(data) => updateMutation.mutate({ id: banner.id, data })} onCancel={() => setEditingId(null)} isSaving={updateMutation.isPending} />;
            }

            return (
              <Card key={banner.id} className="p-4 rounded-2xl shadow-sm">
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.2fr]">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-500">Desktop</p>
                    <div className="aspect-[1600/520] rounded-xl overflow-hidden border bg-gray-100">
                      {(banner.desktop_image_url || banner.image_url) ? <img src={banner.desktop_image_url || banner.image_url} alt={banner.title || 'Desktop flyer'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-500">Mobile</p>
                    <div className="aspect-[1080/640] rounded-xl overflow-hidden border bg-gray-100">
                      {(banner.mobile_image_url || banner.image_url) ? <img src={banner.mobile_image_url || banner.image_url} alt={banner.title || 'Mobile flyer'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-800">{destinationSummary(parsed)}</p>
                        <p className="text-xs text-blue-700 break-all mt-1">{banner.cta_link || 'No link'}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>Order: {Number(banner.order ?? 0)}</span>
                          <span>Ã¢â‚¬Â¢</span>
                          <span>{banner.is_active !== false ? 'Visible' : 'Hidden'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${banner.is_active !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {banner.is_active !== false ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => { setEditingId(banner.id); setShowCreateForm(false); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate({ id: banner.id, is_active: banner.is_active === false })}>
                        {banner.is_active !== false ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                        {banner.is_active !== false ? 'Hide' : 'Show'}
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => deleteMutation.mutate(banner.id)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
