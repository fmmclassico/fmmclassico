import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Loader2, Eye, EyeOff, Settings, Layers } from 'lucide-react';

export default function AdminInterfaceControl() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
  });

  const getSetting = (key) => {
    const val = settings.find(s => s.key === key)?.value;
    if (key.endsWith('_visible')) return val !== 'false';
    return val;
  };

  const saveSetting = async (key, value) => {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const existing = settings.find(s => s.key === key);
      if (existing) {
        await base44.entities.AppSetting.update(existing.id, { value: String(value) });
      } else {
        await base44.entities.AppSetting.create({ key, value: String(value) });
      }
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Updated!');
    } catch {
      toast.error('Failed to save');
    }
    setSaving(s => ({ ...s, [key]: false }));
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (user?.role !== 'admin') return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  const showBrand = getSetting('shop_by_brand_visible') !== false;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Interface Control</h1>
          <p className="text-gray-500 text-sm">Command AI or control app visibility settings</p>
        </div>
        <Badge className="ml-auto bg-cyan-100 text-cyan-700 border-cyan-200">Admin Only</Badge>
      </div>

      {/* Visibility Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Interface Visibility
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">Toggle sections on/off for users</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shop by Brand Toggle */}
          <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">Shop by Brand Section</p>
              <p className="text-xs text-gray-500 mt-0.5">Show/hide the "Shop by Brand" section on homepage</p>
            </div>
            <Button
              size="lg"
              variant={showBrand ? "default" : "outline"}
              onClick={() => saveSetting('shop_by_brand_visible', !showBrand)}
              disabled={saving['shop_by_brand_visible']}
              className="gap-1.5 min-w-32"
            >
              {saving['shop_by_brand_visible'] && <Loader2 className="h-4 w-4 animate-spin" />}
              {showBrand ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showBrand ? 'Visible' : 'Hidden'}
            </Button>
          </div>

          {/* Brand Click Behavior Note */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-1.5">Brand Click Behavior</p>
            <p className="text-xs text-blue-800">When users click a brand in the "Shop by Category" section, they now see expandable subcategory bars showing available products per subcategory.</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Command Center */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            AI Command Center
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">Use AdminAI page to control app behavior</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-900 font-medium mb-2">Generate Content</p>
            <p className="text-xs text-indigo-800 mb-3">Ask the AI assistant to generate product images with watermarks, create videos, design flyers, and more.</p>
            <a href="/AdminAI" className="text-indigo-600 text-xs font-semibold hover:underline">Go to AI Assistant →</a>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-900 font-medium mb-2">Edit Pages</p>
            <p className="text-xs text-purple-800 mb-3">Visit the Home & Categories editor to customize sections, banners, titles, and category cards.</p>
            <a href="/AdminHomeEditor" className="text-purple-600 text-xs font-semibold hover:underline">Go to Page Editor →</a>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900 font-medium mb-2">Page Content</p>
            <p className="text-xs text-green-800 mb-3">Edit text, delivery zones, and content across Cart, Checkout, Orders, and Account pages.</p>
            <a href="/AdminPageContent" className="text-green-600 text-xs font-semibold hover:underline">Go to Content Manager →</a>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          💡 <strong>Tip:</strong> Use the AI Assistant to generate images with watermarks, create promotional videos, and write marketing copy for your store.
        </p>
      </div>
    </div>
  );
}