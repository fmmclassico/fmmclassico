import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { createInitialPaymentReference, createBalancePaymentReference, initiatePayment } from '@/api/hubtelClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, CreditCard, Loader2, Info, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import InlineNotice from '@/components/ui/InlineNotice';
import {
  getAllowedDeliveryZoneIds,
  isTwoStagePaymentEligibleForZone,
  validateGhanaLocationPair,
} from '@/lib/ghanaLocations';
import { getHubtelCallbackUrl } from '@/lib/runtime-config';

const DELIVERY_ZONES = [
  { id: 'accra', label: 'Within Accra Delivery', fee: 30 },
  { id: 'kumasi', label: 'Within Kumasi Delivery', fee: 30 },
  { id: 'umat_doorstep', label: 'UMaT Main Campus – Doorstep Delivery', fee: 10 },
  { id: 'tarkwa', label: 'Approved Tarkwa In-Town Delivery', fee: 25 },
  { id: 'outside', label: 'Outside Kumasi, Accra & Tarkwa', fee: 50 },
  { id: 'bus_station', label: 'Delivery to Bus Stations', fee: 25 },
];

const TWO_STAGE_ZONE_IDS = ['accra', 'kumasi', 'umat_doorstep', 'tarkwa'];

const HUBTEL_CALLBACK_URL = getHubtelCallbackUrl();

// ... existing checkout form, validation, and order-summary logic stays unchanged ...

      const initRes = await initiatePayment({
        totalAmount: orderSummary.totalToPayNow,
        description: payDescription,
        callbackUrl: HUBTEL_CALLBACK_URL,
        returnUrl,
        cancellationUrl,
        clientReference: initialPaymentReference,
      });

      if (initRes?.data?.checkoutUrl) {
        showFeedback('info', 'Redirecting you to Hubtel for secure payment...', 'Opening payment');
        window.location.href = initRes.data.checkoutUrl;
        return;
      }
