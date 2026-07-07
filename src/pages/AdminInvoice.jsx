import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Mail, Search, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

var NL = String.fromCharCode(10);

export default function AdminInvoice() {
  var [user, setUser] = useState(null);
  var [isAdmin, setIsAdmin] = useState(false);
  var [selectedOrder, setSelectedOrder] = useState(null);
  var [search, setSearch] = useState('');
  var [sendingEmail, setSendingEmail] = useState(false);
  var [selectedInvoices, setSelectedInvoices] = useState([]);
  var [invoiceNotes, setInvoiceNotes] = useState('');
  var invoiceRef = useRef(null);
  var queryClient = useQueryClient();

  useEffect(function() {
    base44.auth.isAuthenticated().then(function(isAuth) {
      if (isAuth) {
        base44.auth.me().then(function(userData) { setUser(userData); setIsAdmin(userData.role === 'admin'); });
      }
    });
  }, []);

  var { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: function() { return base44.entities.Order.list('-created_date', 100); },
    enabled: isAdmin,
  });

  // Auto-select from URL
  useEffect(function() {
    if (orders.length > 0) {
      var params = new URLSearchParams(window.location.search);
      var orderId = params.get('orderId');
      var orderNum = params.get('order');
      if (orderId) {
        var found = orders.find(function(o) { return o.id === orderId; });
        if (found) setSelectedOrder(found);
      } else if (orderNum) {
        var found2 = orders.find(function(o) { return o.order_number === orderNum; });
        if (found2) setSelectedOrder(found2);
      }
    }
  }, [orders]);

  var deleteOrdersMutation = useMutation({
    mutationFn: async function(ids) { await Promise.all(ids.map(function(id) { return base44.entities.Order.delete(id); })); },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setSelectedInvoices([]);
      if (selectedOrder && selectedInvoices.includes(selectedOrder.id)) setSelectedOrder(null);
      toast.success('Deleted');
    }
  });

  var handleToggleInvoice = function(id) {
    setSelectedInvoices(function(p) { return p.includes(id) ? p.filter(function(x) { return x !== id; }) : p.concat([id]); });
  };

  var handleDeleteSelected = function() {
    if (selectedInvoices.length === 0) return;
    if (confirm('Delete ' + selectedInvoices.length + ' order(s)/invoice(s)?')) deleteOrdersMutation.mutate(selectedInvoices);
  };

  var filteredOrders = orders.filter(function(o) {
    var q = search.toLowerCase();
    return (o.order_number || '').toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q) || (o.customer_email || '').toLowerCase().includes(q);
  });

  var handlePrint = function() {
    if (!selectedOrder) return;
    var content = invoiceRef.current?.innerHTML;
    var win = window.open('', '_blank');
    win.document.write('<html><head><title>Invoice - ' + selectedOrder.order_number + '</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #1f2937; background: white; padding: 20px; } table { width: 100%; border-collapse: collapse; } th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; } @media print { body { -webkit-print-color-adjust: exact; } }</style></head><body>' + content + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(function() { win.print(); win.close(); }, 500);
  };

  var handleSendEmail = async function() {
    if (!selectedOrder) return;
    setSendingEmail(true);
    var o = selectedOrder;
    var subtotal = o.items?.reduce(function(s, i) { return s + i.price * i.quantity; }, 0) || 0;
    var method = o.payment_method || 'full_payment';
    var methodText = method === 'full_payment' ? 'Full Payment' : method === 'deposit_balance' ? 'Deposit + Balance on Delivery' : 'Pay on Delivery';

    var itemLines = (o.items || []).map(function(item) { return item.product_name + ' x' + item.quantity + ' = GHS ' + (item.price * item.quantity).toFixed(2); }).join(NL);

    var body = 'INVOICE - FMM CLASSICO' + NL + '========================' + NL + NL + 'Order: #' + o.order_number + NL + 'Date: ' + (o.created_date ? format(new Date(o.created_date), 'MMM d, yyyy') : '-') + NL + NL + 'Customer: ' + o.customer_name + NL + 'Phone: ' + o.customer_phone + NL + 'Email: ' + o.customer_email + NL + 'Delivery: ' + o.delivery_address + NL + NL + 'ITEMS:' + NL + itemLines + NL + NL + 'Subtotal: GHS ' + subtotal.toFixed(2) + NL + 'Delivery Fee: GHS ' + (o.delivery_fee || 0).toFixed(2) + NL + 'Payment Method: ' + methodText + NL + (o.balance_due > 0 ? 'Balance Due on Delivery: GHS ' + o.balance_due.toFixed(2) + NL : '') + 'TOTAL CHARGED: GHS ' + o.total_amount?.toFixed(2) + NL + NL + (invoiceNotes ? 'Notes: ' + invoiceNotes + NL + NL : '') + 'Thank you for shopping with FMM CLASSICO!' + NL + 'WhatsApp: 0208207543 | fmmclassico@gmail.com' + NL + 'Tarkwa & Accra, Ghana';

    try {
      await base44.integrations.Core.SendEmail({
        to: o.customer_email,
        from_name: 'FMM CLASSICO',
        subject: 'Invoice - Order #' + o.order_number + ' - FMM CLASSICO',
        body: body,
      });
      toast.success('Invoice sent to ' + o.customer_email);
    } catch (err) {
      toast.error('Failed to send: ' + (err.message || 'Unknown error'));
    }
    setSendingEmail(false);
  };

  if (!user) return <div className="p-8 text-center">Loading...</div>;
  if (!isAdmin) return <div className="p-8 text-center"><p className="text-red-600 font-bold">Access Denied</p></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Invoices</h1>

      <div className="grid md:grid-cols-[300px_1fr] gap-4">
        {/* Order List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search orders..." value={search} onChange={function(e) { setSearch(e.target.value); }} className="pl-9" />
          </div>

          {selectedInvoices.length > 0 && (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} className="w-full text-xs">
              <Trash2 className="h-3 w-3 mr-1" /> Delete {selectedInvoices.length} Selected
            </Button>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {isLoading ? Array(5).fill(0).map(function(_, i) { return <Skeleton key={i} className="h-16 rounded-lg" />; }) : filteredOrders.map(function(order) {
              var isSelected = selectedOrder?.id === order.id;
              var isChecked = selectedInvoices.includes(order.id);
              return (
                <Card key={order.id} onClick={function() { setSelectedOrder(order); setInvoiceNotes(''); }} className={'p-3 cursor-pointer transition-all hover:border-blue-400 ' + (isSelected ? 'border-2 border-blue-500 bg-blue-50' : '') + (isChecked ? ' bg-red-50 border-red-300' : '')}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isChecked} onChange={function(e) { e.stopPropagation(); handleToggleInvoice(order.id); }} onClick={function(e) { e.stopPropagation(); }} className="w-4 h-4 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{order.order_number}</p>
                      <p className="text-[10px] text-gray-500 truncate">{order.customer_name} | ₵{order.total_amount?.toFixed(2)}</p>
                    </div>
                    <span className={'text-[9px] px-1.5 py-0.5 rounded font-medium ' + (order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>{order.payment_status === 'paid' ? 'Paid' : 'Pending'}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Invoice Preview */}
        <div>
          {!selectedOrder ? (
            <div className="flex items-center justify-center h-64 text-gray-400"><FileText className="h-12 w-12 mr-3 opacity-30" /><p>Select an order to view invoice</p></div>
          ) : (
            <div>
              {/* Actions */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button size="sm" onClick={handlePrint}><Printer className="h-3 w-3 mr-1" /> Print</Button>
                <Button size="sm" variant="outline" onClick={handleSendEmail} disabled={sendingEmail}>
                  <Mail className="h-3 w-3 mr-1" /> {sendingEmail ? 'Sending...' : 'Email to Customer'}
                </Button>
              </div>

              {/* Editable Notes */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-700">Invoice Notes (optional, included in email)</label>
                <Textarea className="mt-1 text-xs" rows={2} placeholder="Add custom notes to this invoice..." value={invoiceNotes} onChange={function(e) { setInvoiceNotes(e.target.value); }} />
              </div>

              {/* Invoice Content */}
              <Card className="p-6 bg-white" ref={invoiceRef}>
                {/* Header */}
                <div className="text-center mb-6 border-b pb-4">
                  <h2 className="text-xl font-black text-blue-900">FMM CLASSICO</h2>
                  <p className="text-xs text-gray-500">Phone Accessories | Electronics | Home Appliances</p>
                  <p className="text-xs text-gray-500">Tarkwa & Accra, Ghana | 0208207543</p>
                </div>

                {/* Invoice details */}
                <div className="flex justify-between mb-6">
                  <div>
                    <p className="text-xs text-gray-500">INVOICE TO:</p>
                    <p className="text-sm font-bold">{selectedOrder.customer_name}</p>
                    <p className="text-xs text-gray-600">{selectedOrder.customer_email}</p>
                    <p className="text-xs text-gray-600">{selectedOrder.customer_phone}</p>
                    <p className="text-xs text-gray-600">{selectedOrder.delivery_address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">INVOICE</p>
                    <p className="text-sm font-bold">#{selectedOrder.order_number}</p>
                    <p className="text-xs text-gray-600">{selectedOrder.created_date ? format(new Date(selectedOrder.created_date), 'MMM d, yyyy') : '-'}</p>
                    <p className="text-xs text-gray-600 mt-1">Payment: {selectedOrder.payment_method === 'full_payment' ? 'Full Payment' : selectedOrder.payment_method === 'deposit_balance' ? 'Deposit + Balance' : 'Pay on Delivery'}</p>
                    <p className={'text-xs font-medium mt-1 ' + (selectedOrder.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600')}>{selectedOrder.payment_status === 'paid' ? 'PAID' : 'PENDING'}</p>
                  </div>
                </div>

                {/* Items table */}
                <table className="w-full mb-4 text-xs">
                  <thead><tr className="border-b border-gray-200"><th className="text-left py-2 font-semibold">Product</th><th className="text-center py-2 font-semibold">Qty</th><th className="text-right py-2 font-semibold">Price</th><th className="text-right py-2 font-semibold">Total</th></tr></thead>
                  <tbody>
                    {selectedOrder.items?.map(function(item, idx) {
                      return <tr key={idx} className="border-b border-gray-100"><td className="py-2">{item.product_name}</td><td className="py-2 text-center">{item.quantity}</td><td className="py-2 text-right">₵{item.price?.toFixed(2)}</td><td className="py-2 text-right">₵{(item.price * item.quantity).toFixed(2)}</td></tr>;
                    })}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-3 space-y-1">
                  <div className="flex justify-between text-xs"><span>Subtotal</span><span>₵{(selectedOrder.items?.reduce(function(s, i) { return s + i.price * i.quantity; }, 0) || 0).toFixed(2)}</span></div>
                  {selectedOrder.delivery_fee > 0 && <div className="flex justify-between text-xs"><span>Delivery Fee</span><span>₵{selectedOrder.delivery_fee?.toFixed(2)}</span></div>}
                  {selectedOrder.balance_due > 0 && <div className="flex justify-between text-xs text-orange-700"><span>Balance Due on Delivery</span><span>₵{selectedOrder.balance_due?.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t"><span>Total Charged</span><span>₵{selectedOrder.total_amount?.toFixed(2)}</span></div>
                </div>

                {/* Notes */}
                {invoiceNotes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-600"><strong>Notes:</strong> {invoiceNotes}</p></div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t text-center">
                  <p className="text-[10px] text-gray-400">Thank you for shopping with FMM CLASSICO!</p>
                  <p className="text-[10px] text-gray-400">fmmclassico@gmail.com | 0208207543</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
