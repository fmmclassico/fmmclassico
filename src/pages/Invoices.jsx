import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Invoices() {
  var [user, setUser] = useState(null);

  useEffect(function() {
    base44.auth.me().then(setUser).catch(function() {});
  }, []);

  // Get orders that are paid (these are the invoices)
  var { data: orders = [], isLoading } = useQuery({
    queryKey: ['userInvoices', user?.email],
    queryFn: function() { return base44.entities.Order.filter({ customer_email: user.email, payment_status: 'paid' }, '-created_date', 50); },
    enabled: !!user?.email,
  });

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (orders.length === 0 && !isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-bold text-gray-800">No invoices yet</h2>
        <p className="text-sm text-gray-500">Your invoices will appear here after you make a purchase.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-32">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5" /> My Invoices</h1>
        <p className="text-sm text-gray-500">{orders.length} invoice{orders.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map(function(_, i) { return <Skeleton key={i} className="h-40 w-full rounded-xl" />; })
        ) : (
          orders.map(function(order) {
            var subtotal = order.items ? order.items.reduce(function(s, item) { return s + (item.price * item.quantity); }, 0) : 0;
            var shipping = order.total_amount - subtotal;
            var invoiceDate = order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy') : 'N/A';
            var invoiceTime = order.created_date ? format(new Date(order.created_date), 'h:mm a') : '';
            return (
              <Card key={order.id} className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                {/* Invoice Header */}
                <div style={{ background: '#2E86C1' }} className="text-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-base">FMM CLASSICO</h2>
                      <p className="text-[10px] opacity-80">Phones & Accessories | Electronics | Home Appliances</p>
                      <p className="text-[10px] opacity-80">Accra, Kumasi & Tarkwa (UMaT Campus)</p>
                      <p className="text-[10px] opacity-80">Tel: 0208207543 | fmmclassico@gmail.com</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-70">INVOICE</p>
                      <p className="text-sm font-bold">#{order.order_number}</p>
                      <p className="text-[10px] opacity-80">{invoiceDate}</p>
                      <p className="text-[10px] opacity-80">{invoiceTime}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {/* Customer + Date */}
                  <div className="flex justify-between mb-4 text-xs text-gray-600">
                    <div>
                      <p className="font-semibold text-gray-800">{order.customer_name}</p>
                      <p>{order.customer_email}</p>
                      <p>{order.customer_phone}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-700">Paid</Badge>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="border rounded-xl overflow-hidden mb-3">
                    <div className="bg-gray-50 px-3 py-2 flex text-[10px] font-semibold text-gray-500 uppercase">
                      <span className="flex-1">Product</span>
                      <span className="w-8 text-center">Qty</span>
                      <span className="w-16 text-right">Price</span>
                    </div>
                    {order.items && order.items.map(function(item, idx) {
                      return (
                        <div key={idx} className="px-3 py-2 flex items-center text-xs border-t">
                          <div className="flex-1 flex items-center gap-2">
                            {item.product_image && <img src={item.product_image} alt="" className="w-8 h-8 rounded object-cover" />}
                            <span className="text-gray-800">{item.product_name}</span>
                          </div>
                          <span className="w-8 text-center text-gray-600">{item.quantity}</span>
                          <span className="w-16 text-right font-medium">GHS {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="text-xs space-y-1 text-right">
                    <p className="text-gray-500">Subtotal: GHS {subtotal.toFixed(2)}</p>
                    {shipping > 0 && <p className="text-gray-500">Delivery: GHS {shipping.toFixed(2)}</p>}
                    <p className="text-base font-bold text-gray-900">Total: GHS {order.total_amount?.toFixed(2)}</p>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t text-center text-[10px] text-gray-400">
                    <p style={{ color: '#2E86C1', fontWeight: '600' }}>Thank you for shopping with FMM CLASSICO!</p>
                    <p>For enquiries: WhatsApp 0208207543 | fmmclassico@gmail.com</p>
                    <p>Accra, Kumasi & Tarkwa (UMaT Campus)</p>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
