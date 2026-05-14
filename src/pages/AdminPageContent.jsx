import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// Default content values (fallback if not yet saved in AppSetting)
const DEFAULT_CONTENT = {
  // Cart page
  cart_page_title: 'Shopping Cart',
  cart_empty_title: 'Your cart is empty',
  cart_empty_subtitle: "Looks like you haven't added anything yet",
  cart_checkout_btn: '💳 Place Order & Pay with Paystack',
  cart_continue_btn: 'Continue Shopping',
  cart_delivery_label: 'Delivery / Pickup',
  cart_order_summary_title: 'Order Summary',
  cart_subtotal_label: 'Subtotal',
  cart_delivery_fee_label: 'Delivery Fee',
  cart_total_label: 'Total',
  cart_location_prompt: '📍 Tap to pick your location',

  // Checkout page
  checkout_page_title: 'Checkout',
  checkout_delivery_section_title: 'Delivery Information',
  checkout_payment_section_title: 'Payment Method',
  checkout_order_summary_title: 'Order Summary',
  checkout_submit_btn: '💳 Place Order & Pay with Paystack',
  checkout_fullname_label: 'Full Name *',
  checkout_phone_label: 'Active Phone Number *',
  checkout_address_label: 'Delivery Address / Landmark *',
  checkout_city_label: 'City / Town *',
  checkout_notes_label: 'Order Notes (Optional)',
  checkout_payment_name: 'Pay with Paystack',
  checkout_payment_desc: 'Mobile Money, Card & Bank Transfer – secure checkout',

  // Payment Confirmed page
  confirmed_title: 'Payment Submitted!',
  confirmed_processing_msg: 'Processing your order...',
  confirmed_success_msg: 'Payment confirmed. Your order is being processed and will be verified shortly.',
  confirmed_admin_verified_msg: '🎉 Payment verified! Your order is being prepared.',
  confirmed_track_btn: 'Track My Order',
  confirmed_all_orders_btn: 'View All My Orders',
  confirmed_support_btn: 'Contact Support on WhatsApp',
  confirmed_home_btn: 'Return to Home',

  // Account / Settings page
  account_page_title: 'Account Settings',
  account_personal_section: 'Personal Information',
  account_address_section: 'Delivery Address',
  account_notifications_section: 'Notifications',
  account_save_btn: 'Save Changes',
  account_logout_btn: 'Logout',

  // Orders page
  orders_page_title: 'My Orders',
  orders_empty_title: 'No orders yet',
  orders_empty_subtitle: 'Your order history will appear here once you place an order',
  orders_start_shopping_btn: 'Start Shopping',
};

const SECTIONS = [
  { id: 'cart', label: '🛒 Cart Page', keys: Object.keys(DEFAULT_CONTENT).filter(k => k.startsWith('cart_')) },
  { id: 'checkout', label: '📦 Checkout Page', keys: Object.keys(DEFAULT_CONTENT).filter(k => k.startsWith('checkout_')) },
  { id: 'confirmed', label: '✅ Payment Confirmed Page', keys: Object.keys(DEFAULT_CONTENT).filter(k => k.startsWith('confirmed_')) },
  { id: 'account', label: '👤 Account / Settings Page', keys: Object.keys(DEFAULT_CONTENT).filter(k => k.startsWith('account_')) },
  { id: 'orders', label: '📋 Orders Page', keys: Object.keys(DEFAULT_CONTENT).filter(k => k.startsWith('orders_')) },
];

function prettyKey(key) {
  return key.replace(/^(cart|checkout|confirmed|account|orders)_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminPageContent() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openSection, setOpenSection] = useState('cart');
  const [localValues, setLocalValues] = useState({ ...DEFAULT_CONTENT });
  const [saving, setSaving] = useState({});
  const queryClient = useQueryClient();

  // Delivery zones state
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [savingZones, setSavingZones] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setIsAdmin(u?.role === 'admin'); }).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
    enabled: isAdmin,
    onSuccess: (data) => {
      const merged = { ...DEFAULT_CONTENT };
      data.forEach(s => { if (merged.hasOwnProperty(s.key)) merged[s.key] = s.value; });
      setLocalValues(merged);

      // Load delivery zones
      const zonesEntry = data.find(s => s.key === 'delivery_zones');
      if (zonesEntry) {
        try { setDeliveryZones(JSON.parse(zonesEntry.value)); } catch {}
      } else {
        setDeliveryZones(DEFAULT_DELIVERY_ZONES);
      }
    }
  });

  useEffect(() => {
    if (settings.length > 0) {
      const merged = { ...DEFAULT_CONTENT };
      settings.forEach(s => { if (merged.hasOwnProperty(s.key)) merged[s.key] = s.value; });
      setLocalValues(merged);
      const zonesEntry = settings.find(s => s.key === 'delivery_zones');
      if (zonesEntry) {
        try { setDeliveryZones(JSON.parse(zonesEntry.value)); } catch {}
      } else {
        setDeliveryZones(DEFAULT_DELIVERY_ZONES);
      }
    }
  }, [settings]);

  const saveSetting = async (key) => {
    setSaving(s => ({ ...s, [key]: true }));
    const existing = settings.find(s => s.key === key);
    if (existing) {
      await base44.entities.AppSetting.update(existing.id, { value: localValues[key] });
    } else {
      await base44.entities.AppSetting.create({ key, value: localValues[key] });
    }
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setSaving(s => ({ ...s, [key]: false }));
    toast.success('Saved!');
  };

  const saveAllInSection = async (sectionKeys) => {
    for (const key of sectionKeys) {
      const existing = settings.find(s => s.key === key);
      if (existing) {
        await base44.entities.AppSetting.update(existing.id, { value: localValues[key] });
      } else {
        await base44.entities.AppSetting.create({ key, value: localValues[key] });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    toast.success('All saved!');
  };

  const saveDeliveryZones = async () => {
    setSavingZones(true);
    const existing = settings.find(s => s.key === 'delivery_zones');
    const value = JSON.stringify(deliveryZones);
    if (existing) {
      await base44.entities.AppSetting.update(existing.id, { value });
    } else {
      await base44.entities.AppSetting.create({ key: 'delivery_zones', value });
    }
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setSavingZones(false);
    toast.success('Delivery zones saved!');
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Edit Page Content</h1>
          <p className="text-gray-500 text-sm">Edit all text and labels shown on customer-facing pages</p>
        </div>
        <Badge className="ml-auto bg-green-100 text-green-700 border-green-200">Admin Only</Badge>
      </div>

      {/* Content Sections */}
      {SECTIONS.map(section => (
        <Card key={section.id} className="mb-4 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
          >
            <span className="font-bold text-gray-800">{section.label}</span>
            {openSection === section.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {openSection === section.id && (
            <div className="px-5 pb-5 space-y-4 border-t">
              <div className="space-y-3 mt-4">
                {section.keys.map(key => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{prettyKey(key)}</label>
                    <div className="flex gap-2">
                      {localValues[key]?.length > 60 ? (
                        <Textarea
                          value={localValues[key]}
                          onChange={e => setLocalValues(v => ({ ...v, [key]: e.target.value }))}
                          className="text-sm resize-none"
                          rows={2}
                        />
                      ) : (
                        <Input
                          value={localValues[key]}
                          onChange={e => setLocalValues(v => ({ ...v, [key]: e.target.value }))}
                          className="text-sm"
                        />
                      )}
                      <Button size="sm" onClick={() => saveSetting(key)} disabled={saving[key]} className="flex-shrink-0 bg-[#1B3A6B] hover:bg-[#162f58]">
                        {saving[key] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => saveAllInSection(section.keys)}>
                Save All in This Section
              </Button>
            </div>
          )}
        </Card>
      ))}

      {/* Delivery Zones Editor */}
      <Card className="mb-4 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          onClick={() => setOpenSection(openSection === 'zones' ? null : 'zones')}
        >
          <span className="font-bold text-gray-800">🚚 Delivery / Pickup Dropdown Options</span>
          {openSection === 'zones' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {openSection === 'zones' && (
          <div className="px-5 pb-5 border-t">
            <p className="text-xs text-gray-500 mt-3 mb-3">Edit the delivery options shown in the Cart and Checkout delivery dropdown. Changes apply to both pages.</p>
            <div className="space-y-3">
              {deliveryZones.map((zone, i) => (
                <div key={zone.id || i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      placeholder="Label (e.g. 🏠 Tarkwa Doorstep)"
                      value={zone.label}
                      onChange={e => setDeliveryZones(z => z.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      className="text-xs"
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Note (e.g. ₵10 to your door)"
                        value={zone.note}
                        onChange={e => setDeliveryZones(z => z.map((x, j) => j === i ? { ...x, note: e.target.value } : x))}
                        className="text-xs flex-1"
                      />
                      <Input
                        placeholder="Fee"
                        type="number"
                        value={zone.fee}
                        onChange={e => setDeliveryZones(z => z.map((x, j) => j === i ? { ...x, fee: Number(e.target.value) } : x))}
                        className="text-xs w-20"
                      />
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50 flex-shrink-0" onClick={() => setDeliveryZones(z => z.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3 gap-2" onClick={() => setDeliveryZones(z => [...z, { id: `zone_${Date.now()}`, label: '', note: '', fee: 0 }])}>
              <Plus className="h-4 w-4" /> Add Zone
            </Button>
            <Button className="w-full mt-2 bg-[#1B3A6B] hover:bg-[#162f58]" onClick={saveDeliveryZones} disabled={savingZones}>
              {savingZones ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Delivery Zones
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

const DEFAULT_DELIVERY_ZONES = [
  { id: 'umat_pickup', label: '🏫 UMAT Campus – Pickup / Meeting Point', fee: 0, note: 'FREE – collect on campus' },
  { id: 'umat_doorstep', label: '🏠 UMAT Campus – Doorstep Delivery', fee: 10, note: '₵10 to your door' },
  { id: 'tarkwa_station', label: '🚌 Tarkwa – Delivery to a Station / Car', fee: 20, note: '₵20 to a station or car' },
  { id: 'tarkwa', label: '🏘️ Tarkwa (Outside UMAT) – Doorstep', fee: 25, note: '₵25 delivery fee' },
  { id: 'ashongman', label: '🏠 Ashongman Estate – Pickup Point', fee: 0, note: 'FREE – pickup from our location' },
  { id: 'airport', label: '🏠 Airport Residential Area – Pickup Point', fee: 0, note: 'FREE – pickup from our location' },
  { id: 'accra_station', label: '🚌 Accra – Delivery to a Station / Car', fee: 25, note: '₵25 to a station or car' },
  { id: 'accra_delivery', label: '🚗 Delivery Within Accra', fee: 25, note: '₵25 delivery fee' },
  { id: 'yango', label: '🛵 Yango Delivery – Pay on Delivery', fee: 0, note: 'Yango rider fee paid when product arrives' },
  { id: 'uber', label: '🚗 Uber Delivery – Pay on Delivery', fee: 0, note: 'Uber rider fee paid when product arrives' },
  { id: 'bolt', label: '⚡ Bolt Delivery – Pay on Delivery', fee: 0, note: 'Bolt rider fee paid when product arrives' },
  { id: 'other', label: '📦 Outside Accra & Tarkwa', fee: 50, note: '₵50 flat rate' },
];