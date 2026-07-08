import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Mail, Search, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import InvoiceTemplate from '../components/invoice/InvoiceTemplate';

export default function AdminInvoice() {
  const { user, isAuthenticated } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const invoiceRef = useRef(null);
  const queryClient = useQueryClient();

  const isAdmin = user?.isAdmin === true;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Order.list('-created_date', 100);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (err) {
        console.error('Failed to load orders:', err);
        return [];
      }
    },
    enabled: isAuthenticated && isAdmin,
  });

  // Auto-select order from URL param
  useEffect(() => {
    if (orders.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get('orderId');
      if (orderId) {
        const found = orders.find(o => o.id === orderId);
        if (found) setSelectedOrder(found);
      }
    }
  }, [orders]);

  const deleteOrdersMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.Order.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setSelectedInvoices([]);
      if (selectedOrder && selectedInvoices.includes(selectedOrder.id)) setSelectedOrder(null);
      toast.success('Deleted successfully');
    }
  });

  const handleToggleInvoice = (id) => {
    setSelectedInvoices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = () => {
    if (selectedInvoices.length === 0) return;
    if (confirm(`Delete ${selectedInvoices.length} order(s)/invoice(s)? This cannot be undone.`)) {
      deleteOrdersMutation.mutate(selectedInvoices);
    }
  };

  const filteredOrders = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_email?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = () => {
    if (!selectedOrder) return;
    const printContent = invoiceRef.current?.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
      <head>
      <title>Invoice - ${selectedOrder.order_number} - FMM CLASSICO</title>
      <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #1f2937; background: white; }
      table { width: 100%; border-collapse: collapse; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
      </head>
      <body>
      <div>${printContent}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleSendEmail = async () => {
    if (!selectedOrder) return;
    setSendingEmail(true);
    try {
      const subtotal = selectedOrder.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
      const shipping = selectedOrder.total_amount - subtotal;

      const itemsHtml = selectedOrder.items?.map(item =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.product_name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₵${item.price?.toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₵${(item.price * item.quantity)?.toFixed(2)}</td>
        </tr>`
      ).join('');

      const emailBody = `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif">
          <div style="background:#0A2E60;padding:20px;text-align:center">
            <h1 style="color:white;margin:0">FMM CLASSICO</h1>
            <p style="color:#93c5fd;margin:4px 0 0">Phone Accessories · Electronics · Home Appliances</p>
          </div>
          <div style="padding:24px">
            <h2 style="color:#0A2E60">INVOICE</h2>
            <p><strong>#${selectedOrder.order_number}</strong></p>
            <p>Date: ${selectedOrder.created_date ? format(new Date(selectedOrder.created_date), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}</p>
            <hr style="margin:16px 0"/>
            <p><strong>Bill To</strong></p>
            <p>${selectedOrder.customer_name}</p>
            <p>${selectedOrder.customer_email}</p>
            <p>${selectedOrder.customer_phone || ''}</p>
            <table style="margin-top:16px">
              <thead><tr style="background:#f3f4f6">
                <th style="padding:8px;text-align:left">Product</th>
                <th style="padding:8px;text-align:center">Qty</th>
                <th style="padding:8px;text-align:right">Unit Price</th>
                <th style="padding:8px;text-align:right">Total</th>
              </tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div style="margin-top:16px;text-align:right">
              <p>Subtotal: ₵${subtotal.toFixed(2)}</p>
              ${shipping > 0 ? `<p>Delivery Fee: ₵${shipping.toFixed(2)}</p>` : ''}
              <p style="font-size:18px;font-weight:bold;color:#0A2E60">TOTAL: ₵${selectedOrder.total_amount?.toFixed(2)}</p>
            </div>
            <hr style="margin:16px 0"/>
            <p style="text-align:center;color:#6b7280">Thank you for shopping with FMM CLASSICO! 🧡</p>
            <p style="text-align:center;color:#9ca3af;font-size:12px">WhatsApp: 0208207543 | fmmclassico@gmail.com</p>
            <p style="text-align:center;color:#9ca3af;font-size:12px">Tarkwa (UMAT Campus) & Accra (Ashongman Estate)</p>
          </div>
        </div>
      `;

      await base44.integrations.Core.SendEmail({
        to: selectedOrder.customer_email,
        from_name: 'FMM CLASSICO',
        subject: `🧾 Your Invoice – FMM CLASSICO Order #${selectedOrder.order_number}`,
        body: emailBody,
      });

      toast.success(`Invoice sent to ${selectedOrder.customer_email}`);
    } catch (err) {
      console.error('Email send error:', err);
      toast.error('Failed to send invoice email');
    } finally {
      setSendingEmail(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="p-8 text-center text-gray-500">Please log in to access invoices.</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-500">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Invoices
        </h1>
        <p className="text-gray-500 text-sm">Select an order to generate and send its invoice.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {selectedInvoices.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete {selectedInvoices.length} Selected
              </Button>
            </div>
          )}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : filteredOrders.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No orders found</p>
            ) : filteredOrders.map(order => (
              <Card
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-3 cursor-pointer transition-all hover:border-orange-400 ${
                  selectedOrder?.id === order.id ? 'border-2 border-orange-500 bg-orange-50' : ''
                } ${selectedInvoices.includes(order.id) ? 'bg-red-50 border-red-300' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.includes(order.id)}
                    onChange={() => handleToggleInvoice(order.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 cursor-pointer flex-shrink-0"
                  />
                  <span className="font-semibold text-sm">{order.order_number}</span>
                  {selectedOrder?.id === order.id && <CheckCircle2 className="h-4 w-4 text-orange-500" />}
                </div>
                <p className="text-sm text-gray-600 mt-1">{order.customer_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold">₵{order.total_amount?.toFixed(2)}</span>
                  <Badge variant="outline" className="text-xs">
                    {order.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Invoice Preview */}
        <div>
          {!selectedOrder ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 mb-2" />
              <p>Select an order to preview invoice</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-1" />
                  Print Invoice
                </Button>
                <Button onClick={handleSendEmail} disabled={sendingEmail} size="sm">
                  <Mail className="h-4 w-4 mr-1" />
                  {sendingEmail ? 'Sending...' : 'Email to Customer'}
                </Button>
              </div>

              {/* Invoice Preview Box */}
              <div className="border rounded-lg p-4 bg-white shadow-sm" ref={invoiceRef}>
                <InvoiceTemplate order={selectedOrder} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
