import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Clock, Phone, ChevronDown, Package, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const accraRates = [
  { area: 'Ashongman Estate (Pure Water)', fee: 'PICKUP – FREE', note: 'Collect from us directly', highlight: true },
  { area: 'Airport Residential Area', fee: '₵22', note: '' },
  { area: 'Madina', fee: '₵30', note: '' },
  { area: 'East Legon', fee: '₵30', note: '' },
  { area: 'Adenta', fee: '₵35', note: '' },
  { area: 'Accra Mall', fee: '₵25', note: '' },
  { area: 'Osu', fee: '₵30', note: '' },
  { area: 'Circle', fee: '₵30', note: '' },
  { area: 'Accra Station', fee: '₵35', note: '' },
  { area: 'Makola', fee: '₵35', note: '' },
  { area: 'Spintex', fee: '₵40', note: '' },
  { area: 'Other Accra areas', fee: '₵50', note: 'Outside listed zones' },
];

function AccordionSection({ title, icon: Icon, colorClass, borderClass, bgClass, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-xl overflow-hidden ${borderClass}`}>
      <button
        onClick={() => setOpen(p => !p)}
        className={`w-full flex items-center justify-between p-4 ${bgClass} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${colorClass}`} />
          <span className={`font-bold ${colorClass}`}>{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 ${colorClass} transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-gray-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DeliveryInfoModal({ trigger }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Truck className="h-4 w-4" />
            Delivery Info
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Truck className="h-5 w-5 text-orange-500" />
            Delivery & Pickup Information
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">

          {/* Pickup Points */}
          <AccordionSection
            title="🏪 Pickup Points (FREE)"
            icon={ShoppingBag}
            colorClass="text-green-700"
            borderClass="border-green-200"
            bgClass="bg-green-50"
            defaultOpen={true}
          >
            <div className="space-y-2 mt-3">
              <div className="flex items-start gap-3 bg-green-50 rounded-lg p-3">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-800 text-sm">Ashongman Estate (Pure Water)</p>
                  <p className="text-xs text-green-700">Accra – Come pick up directly from us. FREE!</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-green-50 rounded-lg p-3">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-800 text-sm">UMAT Main Campus</p>
                  <p className="text-xs text-green-700">Tarkwa – Pickup from our campus agent. FREE!</p>
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* Tarkwa Delivery */}
          <AccordionSection
            title="🏘️ Tarkwa Delivery"
            icon={Truck}
            colorClass="text-blue-700"
            borderClass="border-blue-200"
            bgClass="bg-blue-50"
          >
            <div className="space-y-2 mt-3">
              <div className="flex justify-between items-center py-2 border-b border-blue-100">
                <span className="text-sm text-gray-700">Within Tarkwa (outside UMAT)</span>
                <span className="font-bold text-blue-700">₵25</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-700">Orders over ₵300</span>
                <span className="font-bold text-green-600">FREE</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Instant / same-day delivery</span>
              </div>
            </div>
          </AccordionSection>

          {/* Accra Delivery Rates */}
          <AccordionSection
            title="🏙️ Accra Delivery Rates"
            icon={MapPin}
            colorClass="text-orange-700"
            borderClass="border-orange-200"
            bgClass="bg-orange-50"
          >
            <div className="mt-3 space-y-1">
              {accraRates.map((r, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-2 px-2 rounded-lg ${r.highlight ? 'bg-green-50 border border-green-200' : 'border-b border-gray-100 last:border-0'}`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.area}</p>
                    {r.note && <p className="text-xs text-gray-400">{r.note}</p>}
                  </div>
                  <span className={`font-bold text-sm ml-2 ${r.highlight ? 'text-green-700' : 'text-orange-700'}`}>{r.fee}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs text-orange-600 mt-2 pt-1">
                <Clock className="h-3.5 w-3.5" />
                <span>1–2 day delivery via Yango/dispatch</span>
              </div>
            </div>
          </AccordionSection>

          {/* Outside Accra/Tarkwa */}
          <AccordionSection
            title="📦 Outside Accra & Tarkwa"
            icon={Package}
            colorClass="text-purple-700"
            borderClass="border-purple-200"
            bgClass="bg-purple-50"
          >
            <div className="space-y-2 mt-3">
              <div className="flex justify-between items-center py-2 border-b border-purple-100">
                <span className="text-sm text-gray-700">Other regions (standard)</span>
                <span className="font-bold text-purple-700">₵50</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-700">Orders over ₵500</span>
                <span className="font-bold text-green-600">FREE</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-purple-600 mt-1">
                <Clock className="h-3.5 w-3.5" />
                <span>2–5 days delivery</span>
              </div>
            </div>
          </AccordionSection>

          {/* Share Location */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <p className="font-bold text-blue-800 text-sm">📍 Pin Your Exact Location</p>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              For precise delivery, share your exact location via Google Maps or WhatsApp. Tap the button below to open Google Maps and copy/share your location link with us when ordering.
            </p>
            <a
              href="https://maps.google.com?action=mylocation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
              Open My Location on Google Maps
            </a>
            <p className="text-xs text-gray-500 mt-2">Then share the link via WhatsApp to: <strong>0599676419</strong></p>
          </div>

          {/* Customer Service */}
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <Phone className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <p className="font-bold text-white text-base">📞 Customer Service</p>
            <p className="text-orange-300 font-black text-xl mt-1">0599676419</p>
            <p className="text-gray-300 text-xs mt-1">Call or WhatsApp to place an order directly</p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}