import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Mail, Search, FileText, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import InvoiceTemplate from '../components/invoice/InvoiceTemplate';

export default function AdminInvoice() {
  var [user, setUser] = useState(null);
  var [isAdmin, setIsAdmin] = useState(false);
  var [selectedOrder, setSelectedOrder] = useState(null);
  var [search, setSearch] = useState('');
  var [sendingEmail, setSendingEmail] = useState(false);
  var [sendingToPage, setSendingToPage] = useState(false);
  var [selectedInvoices, setSelectedInvoices] = useState([]);
  var invoiceRef = useRef(null);
  var queryClient = useQueryClient();

  useEffect(function() {
    var checkAdmin = async function() {
      var isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        var userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      }
    };
    checkAdmin();
  }, []);

  var { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: function() { return base44.entities.Order.list('-created_date', 100); },
    enabled: isAdmin,
  });

  var paidOrders = orders.filter(function(o) { return o.payment_status === 'paid'; });

  useEffect(function() {
    if (paidOrders.length > 0) {
      var params = new URLSearchParams(window.location.search);
      var orderId = params.get('order');
      if (orderId) {
        var found = paidOrders.find(function(o) { return o.id === orderId; });
        if (found) setSelectedOrder(found);
      }
    }
  }, [paidOrders]);

  var deleteOrdersMutation = useMutation({
    mutationFn: async function(ids) {
      await Promise.all(ids.map(function(id) { return base44.entities.Order.delete(id); }));
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setSelectedInvoices([]);
      if (selectedOrder && selectedInvoices.includes(selectedOrder.id)) setSelectedOrder(null);
      toast.success('Deleted successfully');
    }
  });

  var handleToggleInvoice = function(id) {
    setSelectedInvoices(function(prev) { return prev.includes(id) ? prev.filter(function(x) { return x !== id; }) : prev.concat([id]); });
  };

  var handleDeleteSelected = function() {
    if (selectedInvoices.length === 0) return;
    if (confirm('Delete ' + selectedInvoices.length + ' invoice(s)? This cannot be undone.')) {
      deleteOrdersMutation.mutate(selectedInvoices);
    }
  };

  var filteredOrders = paidOrders.filter(function(o) {
    var s = search.toLowerCase();
    return (o.order_number || '').toLowerCase().includes(s) || (o.customer_name || '').toLowerCase().includes(s) || (o.customer_email || '').toLowerCase().includes(s);
  });

  var handlePrint = function() {
    if (!selectedOrder) return;
    var printContent = invoiceRef.current?.innerHTML;
    var win = window.open('', '_blank');
    win.document.write('<html><head><title>Invoice - ' + selectedOrder.order_number + '</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, sans-serif; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style></head><body>' + printContent + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(function() { win.print(); win.close(); }, 500);
  };

  var handleSendEmail = async function() {
    if (!selectedOrder) return;
    setSendingEmail(true);
    var subtotal = selectedOrder.items?.reduce(function(s, i) { return s + i.price * i.quantity; }, 0) || 0;
    var shipping = selectedOrder.total_amount - subtotal;
    var nl = String.fromCharCode(10);

    var itemsText = selectedOrder.items?.map(function(item) {
      return item.product_name + ' x' + item.quantity + ' = GHS ' + (item.price * item.quantity).toFixed(2);
    }).join(nl) || '';

    var emailBody = 'INVOICE #' + selectedOrder.order_number + nl + nl + 'Date: ' + (selectedOrder.created_date ? format(new Date(selectedOrder.created_date), 'dd MMM yyyy h:mm a') : 'N/A') + nl + nl + 'Bill To: ' + selectedOrder.customer_name + nl + 'Email: ' + selectedOrder.customer_email + nl + 'Phone: ' + selectedOrder.customer_phone + nl + nl + 'Items:' + nl + itemsText + nl + nl + 'Subtotal: GHS ' + subtotal.toFixed(2) + (shipping > 0 ? nl + 'Delivery: GHS ' + shipping.toFixed(2) : '') + nl + 'TOTAL: GHS ' + selectedOrder.total_amount?.toFixed(2) + nl + nl + 'Payment Status: PAID' + nl + nl + 'Thank you for shopping with FMM CLASSICO!' + nl + 'For enquiries: WhatsApp 0208207543 | fmmclassico@gmail.com' + nl + 'Accra, Kumasi & Tarkwa (UMaT Campus)';

    await base44.integrations.Core.SendEmail({
      to: selectedOrder.customer_email,
      from_name: 'FMM CLASSICO',
      subject: 'Your Invoice - FMM CLASSICO Order #' + selectedOrder.order_number,
      body: emailBody,
    });

    setSendingEmail(false);
    toast.success('Invoice emailed to ' + selectedOrder.customer_email);
  };

  var handleSendToInvoicePage = async function() {
    if (!selectedOrder) return;
    setSendingToPage(true);
    try {
      // Save invoice to invoices table so it shows on customer's invoice page
      await base44.entities.Invoice.create({
        order_id: selectedOrder.id,
        order_number: selectedOrder.order_number,
        customer_email: selectedOrder.customer_email,
        customer_name: selectedOrder.customer_name,
        total_amount: selectedOrder.total_amount,
        sent_at: new Date().toISOString(),
      });
      toast.success('Invoice sent to customer\'s invoice page!');
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
    setSendingToPage(false);
  };

  if (!user) return <div className="p-8 text-center">Loading...</div>;
  if (!isAdmin) return <div className="p-8 text-center"><p>Access Denied. Admins only.</p></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-500">Select an order to view, print, or send its invoice.</p>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        {/* Order List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search orders..." value={search} onChange={function(e) { setSearch(e.target.value); }} className="pl-9 rounded-xl" />
          </div>
          {selectedInvoices.length > 0 && (
            <Button variant="destructive" size="sm" className="w-full rounded-xl" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete {selectedInvoices.length} Selected
            </Button>
          )}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              Array(5).fill(0).map(function(_, i) { return <Skeleton key={i} className="h-16 rounded-xl" />; })
            ) : filteredOrders.map(function(order) {
              var isSelected = selectedOrder?.id === order.id;
              var isChecked = selectedInvoices.includes(order.id);
              return (
                <Card key={order.id} onClick={function() { setSelectedOrder(order); }} className={'p-3 cursor-pointer transition-all rounded-xl border-2 ' + (isSelected ? 'border-[#2E86C1] bg-blue-50' : isChecked ? 'border-red-300 bg-red-50' : 'border-transparent hover:border-[#2E86C1]/30')}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isChecked} onChange={function(e) { e.stopPropagation(); handleToggleInvoice(order.id); }} onClick={function(e) { e.stopPropagation(); }} className="w-4 h-4 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-500 truncate">{order.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#2E86C1]">GHS {order.total_amount?.toFixed(2)}</p>
                      <Badge className="text-[9px] bg-green-100 text-green-700">Paid</Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Invoice Preview */}
        <div>
          {!selectedOrder ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-2xl">
              <div className="text-center text-gray-400">
                <FileText className="mx-auto w-10 h-10 mb-2" />
                <p className="text-sm">Select an order to preview invoice</p>
              </div>
            </div>
          ) : (
            <div>
              {/* Action Buttons */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <Button onClick={handlePrint} className="rounded-xl bg-[#2E86C1] text-white hover:bg-[#2578ae]">
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
                <Button onClick={handleSendEmail} disabled={sendingEmail} className="rounded-xl bg-[#2E86C1] text-white hover:bg-[#2578ae]">
                  <Mail className="w-4 h-4 mr-1" /> {sendingEmail ? 'Sending...' : 'Email to Customer'}
                </Button>
                <Button onClick={handleSendToInvoicePage} disabled={sendingToPage} variant="outline" className="rounded-xl border-[#2E86C1] text-[#2E86C1] hover:bg-blue-50">
                  <Send className="w-4 h-4 mr-1" /> {sendingToPage ? 'Sending...' : 'Send to Invoice Page'}
                </Button>
              </div>

              {/* Invoice Preview */}
              <div className="border rounded-2xl overflow-hidden shadow-sm">
                <InvoiceTemplate order={selectedOrder} invoiceRef={invoiceRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
