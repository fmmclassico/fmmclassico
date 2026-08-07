import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, MapPin, ShieldCheck, Truck } from 'lucide-react';

const DELIVERY_OPTIONS = [
  { name: 'Greater Accra Delivery', fee: '₵30', note: 'Approved Accra deliveries' },
  { name: 'Kumasi Delivery', fee: '₵30', note: 'City delivery service' },
  { name: 'Tarkwa / Western Region Delivery', fee: '₵25', note: 'Approved Tarkwa and nearby Western Region deliveries' },
  { name: 'Other Regions Delivery', fee: '₵50', note: 'Standard nationwide delivery option' },
];

const PAYMENT_PLANS = [
  {
    title: 'Plan 1: Full Online Payment',
    description: 'Pay the full order amount online through Hubtel during checkout.',
  },
  {
    title: 'Plan 2: Deposit Now, Balance Later',
    description: 'Available only for approved Greater Accra and Tarkwa / Western Region deliveries. The remaining balance is paid from the Order page after shipment and must be verified before handover.',
  },
  {
    title: 'Plan 3: Delivery Fee Now, Balance Later',
    description: 'Available only for approved Greater Accra and Tarkwa / Western Region deliveries. The outstanding balance is paid from the Order page after shipment and must be verified before handover.',
  },
];

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
            Delivery & Payment Information
          </DialogTitle>
          <DialogDescription>
            Review the approved delivery options, payment plans, and location requirements before checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <p className="font-semibold text-slate-900">Approved Delivery Options</p>
            </div>
            <div className="space-y-2">
              {DELIVERY_OPTIONS.map((option) => (
                <div key={option.name} className="flex items-start justify-between gap-3 rounded-lg bg-white border p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{option.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{option.note}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-700">{option.fee}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <p className="font-semibold text-slate-900">Checkout Payment Plans</p>
            </div>
            <div className="space-y-2">
              {PAYMENT_PLANS.map((plan) => (
                <div key={plan.title} className="rounded-lg bg-white border p-3">
                  <p className="text-sm font-medium text-slate-900">{plan.title}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-5">{plan.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-700" />
              <p className="font-semibold text-blue-900">Required Delivery Details</p>
            </div><ul className="list-disc pl-5 text-xs text-blue-900 space-y-1">
              <li>Region</li>
              <li>City</li>
              <li>Specific location</li>
              <li>Google auto-detected location link</li>
            </ul>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <p className="font-semibold text-emerald-900">Verification Note</p>
            </div>
            <p className="text-xs text-emerald-900 leading-5">
              Every payment is confirmed through Hubtel before an order is treated as paid. For staged payments, the remaining balance must be verified successfully before the product is handed over.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
