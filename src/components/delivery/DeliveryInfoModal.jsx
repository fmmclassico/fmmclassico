import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Clock, Package, ExternalLink } from 'lucide-react';

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
            Delivery Information
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Tarkwa / UMAT Delivery */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-green-600" />
              <h3 className="font-bold text-green-800">Tarkwa & UMAT Campus</h3>
            </div>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-green-600">FREE</span>
                <span>- Delivery within UMAT Campus (meeting point/pickup)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">₵25</span>
                <span>- Delivery within Tarkwa (outside UMAT)</span>
              </li>
            </ul>
            <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Instant delivery</span>
            </div>
          </div>

          {/* Accra Delivery */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-blue-800">Accra Delivery</h3>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              For deliveries within Accra, we use <strong>Yango</strong> for fast and reliable delivery from our locations at Ashongman Estate or Airport Residential Area.
            </p>
            <a 
              href="https://yango.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Check Yango for delivery rates <ExternalLink className="h-3 w-3" />
            </a>
            <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
              <Clock className="h-4 w-4" />
              <span className="font-medium">1-2 days delivery</span>
            </div>
          </div>

          {/* Outside Accra */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-orange-600" />
              <h3 className="font-bold text-orange-800">Outside Accra & Tarkwa</h3>
            </div>
            <ul className="space-y-2 text-sm text-orange-700">
              <li className="flex items-start gap-2">
                <span className="font-semibold">₵30 - ₵50</span>
                <span>- Depending on location and item size</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">₵30 - ₵45</span>
                <span>- Via Speedaf courier (depends on weight)</span>
              </li>
            </ul>
            <div className="mt-3 flex items-center gap-2 text-xs text-orange-600">
              <Clock className="h-4 w-4" />
              <span className="font-medium">2-3 days delivery</span>
            </div>
          </div>

          {/* Contact for custom delivery */}
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Have a specific delivery request? Contact us!
            </p>
            <p className="font-bold text-gray-800">📞 0599676419</p>
            <p className="text-sm text-gray-600">fmmcompanylimited@gmail.com</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}