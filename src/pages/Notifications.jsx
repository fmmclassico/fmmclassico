import { useAuth } from "@/lib/AuthContext";
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { supabaseNotifications } from '@/lib/supabaseNotifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useAuth } from '@/lib/AuthContext';
import { useAuth } from '@/lib/AuthContext';
import { Bell, Package, CheckCircle2, Clock, Truck, ChevronRight, Check, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const typeConfig = {
  order_placed: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Order Placed' },
  payment_confirmed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Payment Confirmed' },
  payment_pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Awaiting Verification' },
  order_processing: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Processing' },
  order_shipped: { icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Shipped' },
  order_delivered: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Delivered' },
  order_cancelled: { icon: Clock, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' },
  delivery_update: { icon: Truck, color: 'text-blue-700', bg: 'bg-blue-50', label: 'Delivery Update' },
  general: { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Notice' },
};

export default function Notifications() {
  const { user, isAuthenticated } = useAuth();
  const [selectedNotifs, setSelectedNotifs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

