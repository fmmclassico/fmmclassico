import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

export default function Invoices() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['user-invoices', user?.email],
    queryFn: async () => {
      try {
        const result = await base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 100);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (err) {
        console.error('Failed to load invoices:', err);
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const paidOrders = orders.filter(o => o.payment_status === 'paid' || o.status === 'delivered' || o.status === 'shipped' || o.status === 'confirmed');

  const handlePrint = (order) => {
    const subtotal = order.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
    const shipping = order.total_amount - subtotal;
    const itemsHtml = order.items?.map(item => `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb">${item.product_name}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">₵${item.price?.toFixed(2)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">₵${(item.price * item.quantity)?.toFixed(2)}</td></tr>`).join('') || '';

    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Invoice #${order.order_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f8fafc;padding:20px}table{width:100%;border-collapse:collapse}.invoice{max-width:700px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#031725,#0A2E60);color:white;padding:30px;text-align:center}.header h1{font-size:24px;margin-bottom:4px}.header p{opacity:0.8;font-size:13px}@media print{body{padding:0;background:white}.invoice{box-shadow:none}}</style></head><body><div class="invoice"><div class="header"><h1>FMM CLASSICO</h1><p>Phones & Accessories · Electronics · Home Appliances</p><p style="margin-top:8px;font-size:12px">Tarkwa (UMAT Campus) & Accra (Ashongman Estate)</p></div><div style="padding:30px"><div style="display:flex;justify-content:space-between;margin-bottom:20px"><div><h3 style="color:#0A2E60;margin-bottom:8px">INVOICE</h3><p style="font-size:14px"><strong>#${order.order_number}</strong></p><p style="font-size:13px;color:#6b7280">Date: ${order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy, h:mm a') : '-'}</p></div><div style="text-align:right"><p style="font-size:13px;font-weight:bold">Bill To:</p><p style="font-size:13px">${order.customer_name || ''}</p><p style="font-size:12px;color:#6b7280">${order.customer_email || ''}</p><p style="font-size:12px;color:#6b7280">${order.customer_phone || ''}</p></div></div><table style="margin-top:16px"><thead><tr style="background:#f1f5f9"><th style="padding:10px;text-align:left;font-size:13px">Product</th><th style="padding:10px;text-align:center;font-size:13px">Qty</th><th style="padding:10px;text-align:right;font-size:13px">Price</th><th style="padding:10px;text-align:right;font-size:13px">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table><div style="margin-top:20px;text-align:right;border-top:2px solid #e5e7eb;padding-top:16px"><p style="font-size:13px;margin-bottom:4px">Subtotal: ₵${subtotal.toFixed(2)}</p>${shipping > 0 ? `<p style="font-size:13px;margin-bottom:4px">Delivery: ₵${shipping.toFixed(2)}</p>` : ''}<p style="font-size:18px;font-weight:bold;color:#0A2E60;margin-top:8px">TOTAL: ₵${order.total_amount?.toFixed(2)}</p></div><div style="margin-top:30px;text-align:center;padding:16px;background:#f8fafc;border-radius:8px"><p style="font-size:13px;color:#6b7280">Thank you for shopping with FMM CLASSICO! 🧡</p><p style="font-size:11px;color:#9ca3af;margin-top:4px">WhatsApp: 0208207543 | fmmclassico@gmail.com</p></div></div></div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#0A2E60] flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Invoices</h1>
            <p className="text-xs text-gray-500">View and download your order invoices</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : paidOrders.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No invoices yet</p>
            <p className="text-sm text-gray-400 mt-1">Invoices appear after you place an order</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paidOrders.map(order => {
              const isExpanded = expandedInvoice === order.id;
              const subtotal = order.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
              const shipping = order.total_amount - subtotal;

              return (
                <Card key={order.id} className="overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedInvoice(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">#{order.order_number}</p>
                        <p className="text-xs text-gray-500">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : '-'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#0A2E60]">₵{order.total_amount?.toFixed(2)}</p>
                          <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-gradient-to-b from-[#f8fafc] to-white p-4">
                      {/* Invoice Preview */}
                      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-gradient-to-r from-[#031725] to-[#0A2E60] p-4 text-center">
                          <h3 className="text-white font-bold text-lg">FMM CLASSICO</h3>
                          <p className="text-white/70 text-xs">Phones & Accessories · Electronics · Home Appliances</p>
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between mb-3">
                            <div>
                              <p className="text-xs font-bold text-[#0A2E60]">INVOICE #{order.order_number}</p>
                              <p className="text-[10px] text-gray-500">{order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy, h:mm a') : ''}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500">Bill To:</p>
                              <p className="text-xs font-medium">{order.customer_name}</p>
                            </div>
                          </div>
                          <div className="border-t pt-2 space-y-1">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="text-gray-700">{item.product_name} x{item.quantity}</span>
                                <span className="font-medium">₵{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t mt-2 pt-2 space-y-1">
                            <div className="flex justify-between text-xs"><span className="text-gray-500">Subtotal</span><span>₵{subtotal.toFixed(2)}</span></div>
                            {shipping > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Delivery</span><span>₵{shipping.toFixed(2)}</span></div>}
                            <div className="flex justify-between text-sm font-bold text-[#0A2E60] pt-1"><span>TOTAL</span><span>₵{order.total_amount?.toFixed(2)}</span></div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePrint(order)}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-[#0A2E60] text-white rounded-lg text-sm font-medium hover:bg-[#083050] transition-colors"
                      >
                        <Download className="h-4 w-4" /> Download / Print Invoice
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
