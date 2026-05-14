import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Loader2, RotateCcw, CheckCircle2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const NAVY = '#1B3A6B';

const DEFAULTS = {
  about_hero_title: 'About FMM CLASSICO',
  about_hero_subtitle: 'Your trusted destination for premium Phones & Accessories, Home Appliances and Electronics. Quality products, unbeatable prices, exceptional service.',
  about_story_title: 'Our Story',
  about_story_p1: 'FMM CLASSICO was founded with a simple mission: to provide high-quality phone accessories, electronic appliances, and home appliances at affordable prices. We understand the importance of protecting and enhancing your mobile devices while also delivering reliable electronic and household solutions for everyday living.',
  about_story_p2: 'Since our inception, we have served thousands of satisfied customers through both retail and wholesale, offering a carefully curated selection of phone cases, chargers, earphones, consumer electronics, and essential home appliances. Every product in our catalog is selected and tested to ensure quality, performance, and durability.',
  about_story_p3: 'We believe everyone deserves access to premium products without excessive cost. That is why we work directly with manufacturers and trusted suppliers to deliver dependable products at competitive prices.',
  about_years_badge: '5+',
  about_years_label: 'Years of Excellence',
  about_stat1_value: '10K+',
  about_stat1_label: 'Happy Customers',
  about_stat2_value: '5K+',
  about_stat2_label: 'Products Sold',
  about_stat3_value: '4.8',
  about_stat3_label: 'Average Rating',
  about_stat4_value: '24/7',
  about_stat4_label: 'Support Available',
  about_whychoose_title: 'Why Choose Us',
  about_whychoose_subtitle: 'The FMM CLASSICO difference',
  about_val1_title: 'Quality Assurance',
  about_val1_desc: 'We only sell genuine, high-quality products from trusted suppliers.',
  about_val2_title: 'Fast Delivery',
  about_val2_desc: 'Quick and reliable delivery to your doorstep with real-time tracking.',
  about_val3_title: 'Customer Support',
  about_val3_desc: '24/7 AI-powered support and dedicated customer service team.',
  about_val4_title: 'Customer First',
  about_val4_desc: 'Your satisfaction is our top priority. Easy returns and exchanges.',
  about_mission_title: 'Our Mission',
  about_mission_text: 'To provide every customer with access to premium quality Phones & Accessories, Home Appliances and Electronics at affordable prices, backed by exceptional customer service and fast delivery.',
  about_vision_title: 'Our Vision',
  about_vision_text: 'To become the most trusted and preferred destination for Phones & Accessories, Home Appliances and Electronics, known for our quality, reliability, and customer satisfaction.',
  about_contact_title: 'Get in Touch',
  about_contact_subtitle: "We'd love to hear from you",
  about_location1_title: 'Tarkwa Location',
  about_location1_addr: 'UMAT Main Campus, Tarkwa',
  about_location2_title: 'Accra Location',
  about_location2_addr: 'Ashongman Estate, Accra',
  about_phone: '0599676419',
  about_email: 'fmmcompanylimited@gmail.com',
  about_cta_title: 'Ready to Shop?',
  about_cta_subtitle: 'Explore our wide range of Phones & Accessories, Home Appliances and Electronics.',
};

const SECTIONS = [
  {
    title: 'Hero Section',
    fields: [
      { key: 'about_hero_title', label: 'Hero Title', type: 'input' },
      { key: 'about_hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
    ]
  },
  {
    title: 'Stats (Numbers)',
    fields: [
      { key: 'about_stat1_value', label: 'Stat 1 Value', type: 'input' },
      { key: 'about_stat1_label', label: 'Stat 1 Label', type: 'input' },
      { key: 'about_stat2_value', label: 'Stat 2 Value', type: 'input' },
      { key: 'about_stat2_label', label: 'Stat 2 Label', type: 'input' },
      { key: 'about_stat3_value', label: 'Stat 3 Value', type: 'input' },
      { key: 'about_stat3_label', label: 'Stat 3 Label', type: 'input' },
      { key: 'about_stat4_value', label: 'Stat 4 Value', type: 'input' },
      { key: 'about_stat4_label', label: 'Stat 4 Label', type: 'input' },
    ]
  },
  {
    title: 'Our Story',
    fields: [
      { key: 'about_story_title', label: 'Section Title', type: 'input' },
      { key: 'about_story_p1', label: 'Paragraph 1', type: 'textarea' },
      { key: 'about_story_p2', label: 'Paragraph 2', type: 'textarea' },
      { key: 'about_story_p3', label: 'Paragraph 3', type: 'textarea' },
      { key: 'about_years_badge', label: 'Years Badge Number', type: 'input' },
      { key: 'about_years_label', label: 'Years Badge Label', type: 'input' },
    ]
  },
  {
    title: 'Why Choose Us',
    fields: [
      { key: 'about_whychoose_title', label: 'Section Title', type: 'input' },
      { key: 'about_whychoose_subtitle', label: 'Section Subtitle', type: 'input' },
      { key: 'about_val1_title', label: 'Value 1 Title', type: 'input' },
      { key: 'about_val1_desc', label: 'Value 1 Description', type: 'textarea' },
      { key: 'about_val2_title', label: 'Value 2 Title', type: 'input' },
      { key: 'about_val2_desc', label: 'Value 2 Description', type: 'textarea' },
      { key: 'about_val3_title', label: 'Value 3 Title', type: 'input' },
      { key: 'about_val3_desc', label: 'Value 3 Description', type: 'textarea' },
      { key: 'about_val4_title', label: 'Value 4 Title', type: 'input' },
      { key: 'about_val4_desc', label: 'Value 4 Description', type: 'textarea' },
    ]
  },
  {
    title: 'Mission & Vision',
    fields: [
      { key: 'about_mission_title', label: 'Mission Title', type: 'input' },
      { key: 'about_mission_text', label: 'Mission Text', type: 'textarea' },
      { key: 'about_vision_title', label: 'Vision Title', type: 'input' },
      { key: 'about_vision_text', label: 'Vision Text', type: 'textarea' },
    ]
  },
  {
    title: 'Contact Info',
    fields: [
      { key: 'about_contact_title', label: 'Section Title', type: 'input' },
      { key: 'about_contact_subtitle', label: 'Section Subtitle', type: 'input' },
      { key: 'about_location1_title', label: 'Location 1 Title', type: 'input' },
      { key: 'about_location1_addr', label: 'Location 1 Address', type: 'input' },
      { key: 'about_location2_title', label: 'Location 2 Title', type: 'input' },
      { key: 'about_location2_addr', label: 'Location 2 Address', type: 'input' },
      { key: 'about_phone', label: 'Phone Number', type: 'input' },
      { key: 'about_email', label: 'Email Address', type: 'input' },
    ]
  },
  {
    title: 'Call to Action (Bottom)',
    fields: [
      { key: 'about_cta_title', label: 'CTA Title', type: 'input' },
      { key: 'about_cta_subtitle', label: 'CTA Subtitle', type: 'textarea' },
    ]
  },
];

export default function AdminAbout() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [localValues, setLocalValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setIsAdmin(u?.role === 'admin'); }).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
    enabled: isAdmin,
  });

  const getValue = (key) => {
    if (localValues[key] !== undefined) return localValues[key];
    return settings.find(s => s.key === key)?.value ?? DEFAULTS[key] ?? '';
  };

  const handleChange = (key, value) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const dirtyKeys = Object.keys(localValues);
    for (const key of dirtyKeys) {
      const existing = settings.find(s => s.key === key);
      if (existing) {
        await base44.entities.AppSetting.update(existing.id, { value: localValues[key] });
      } else {
        await base44.entities.AppSetting.create({ key, value: localValues[key] });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setLocalValues({});
    setSaving(false);
    setSaved(true);
    toast.success('About page updated!');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = (key) => {
    setLocalValues(prev => ({ ...prev, [key]: DEFAULTS[key] ?? '' }));
  };

  const dirtyCount = Object.keys(localValues).length;

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl pb-24">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: NAVY }}>
            <Edit2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit About Page</h1>
            <p className="text-gray-500 text-sm">All changes update the public About page instantly.</p>
          </div>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={saving || dirtyCount === 0}
          className="gap-2 text-white font-bold"
          style={{ background: NAVY }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : `Save ${dirtyCount > 0 ? `(${dirtyCount})` : ''}`}
        </Button>
      </div>

      {dirtyCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 text-sm text-amber-700 font-medium flex items-center gap-2">
          <Edit2 className="h-4 w-4" />
          {dirtyCount} unsaved change(s) — click Save to apply.
        </div>
      )}

      <div className="space-y-6">
        {SECTIONS.map(section => (
          <Card key={section.title} className="p-5">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b text-base" style={{ color: NAVY }}>{section.title}</h2>
            <div className="space-y-4">
              {section.fields.map(field => {
                const currentVal = getValue(field.key);
                const isDirty = localValues[field.key] !== undefined;
                return (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-1">
                      <Label className={`text-sm font-medium ${isDirty ? 'text-amber-600' : 'text-gray-700'}`}>
                        {field.label} {isDirty && <span className="text-xs">(unsaved)</span>}
                      </Label>
                      {isDirty && (
                        <button onClick={() => handleReset(field.key)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" /> Reset
                        </button>
                      )}
                    </div>
                    {field.type === 'textarea' ? (
                      <Textarea
                        value={currentVal}
                        onChange={e => handleChange(field.key, e.target.value)}
                        rows={3}
                        className={isDirty ? 'border-amber-400 focus:ring-amber-300' : ''}
                      />
                    ) : (
                      <Input
                        value={currentVal}
                        onChange={e => handleChange(field.key, e.target.value)}
                        className={isDirty ? 'border-amber-400 focus:ring-amber-300' : ''}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Sticky save bar */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50 px-4">
          <div className="bg-white border shadow-xl rounded-2xl px-6 py-3 flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">{dirtyCount} unsaved change(s)</span>
            <Button onClick={handleSaveAll} disabled={saving} className="gap-2 text-white" style={{ background: NAVY }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}