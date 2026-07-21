import React, { useState, useEffect, useRef } from 'react';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Mail, Search, FileText, CheckCircle2, Trash2, Edit3, Save, Bold, Italic, Type } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

export default function AdminInvoice() {
  const { user, isAuthenticated } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editableNote, setEditableNote] = useState('');
  const [editableFooter, setEditableFooter] = useState('Thank you for shopping with FMM CLASSICO! 🧡');
  const invoiceRef = useRef(null);
  const queryClient = useQueryClient();

  const isAdmin = user?.isAdmin === true;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: async () => {
      try {
        const result = await appClient.entities.Order.list('-created_date', 100);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (err) {
        console.error('Failed to load orders:', err);
        return [];
      }
    },
    enabled: isAuthenticated && isAdmin,
  });

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
    mutationFn: async (ids) => { await Promise.all(ids.map(id => appClient.entities.Order.delete(id))); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setSelectedInvoices([]);
      if (selectedOrder && selectedInvoices.includes(selectedOrder.id)) setSelectedOrder(null);
      toast.success('Deleted successfully');
    }
  });

  const handleToggleInvoice = (id) => { setSelectedInvoices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const handleDeleteSelected = () => { if (selectedInvoices.length === 0) return; if (confirm('Delete ' + selectedInvoices.length + ' order(s)?')) deleteOrdersMutation.mutate(selectedInvoices); };

  const filteredOrders = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_email?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = () => {
    if (!selectedOrder) return;
    const printContent = invoiceRef.current?.innerHTML;
    const win = window.open('', '_blank');
    win.document.write('<html><head><title>Invoice - ' + selectedOrder.order_number + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937;background:white}table{width:100%;border-collapse:collapse}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>' + printContent + '</body></html>');
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
      const itemsHtml = selectedOrder.items?.map(item => '<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:13px">' + item.product_name + '</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px">' + item.quantity + '</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px">₵' + item.price?.toFixed(2) + '</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px">₵' + (item.price * item.quantity)?.toFixed(2) + '</td></tr>').join('') || '';

      const emailBody = '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#f8fafc;padding:20px"><div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08)"><div style="background:linear-gradient(135deg,#031725,#0A2E60);color:white;padding:30px;text-align:center"><h1 style="margin:0;font-size:22px">FMM CLASSICO</h1><p style="opacity:0.8;font-size:12px;margin-top:4px">Phones & Accessories · Electronics · Home Appliances</p><p style="opacity:0.7;font-size:11px;margin-top:4px">Tarkwa (UMAT Campus) & Accra (Ashongman Estate)</p></div><div style="padding:24px"><div style="display:flex;justify-content:space-between;margin-bottom:16px"><div><h3 style="color:#0A2E60;font-size:16px;margin-bottom:4px">INVOICE</h3><p style="font-size:13px"><strong>#' + selectedOrder.order_number + '</strong></p><p style="font-size:12px;color:#6b7280">Date: ' + (selectedOrder.created_date ? format(new Date(selectedOrder.created_date), 'dd MMM yyyy, h:mm a') : format(new Date(), 'dd MMM yyyy')) + '</p></div></div><div style="background:#f1f5f9;padding:12px;border-radius:8px;margin-bottom:16px"><p style="font-size:12px;font-weight:bold;color:#374151">Bill To:</p><p style="font-size:13px">' + (selectedOrder.customer_name || '') + '</p><p style="font-size:12px;color:#6b7280">' + (selectedOrder.customer_email || '') + '</p><p style="font-size:12px;color:#6b7280">' + (selectedOrder.customer_phone || '') + '</p></div><table><thead><tr style="background:#f1f5f9"><th style="padding:10px;text-align:left;font-size:12px">Product</th><th style="padding:10px;text-align:center;font-size:12px">Qty</th><th style="padding:10px;text-align:right;font-size:12px">Price</th><th style="padding:10px;text-align:right;font-size:12px">Total</th></tr></thead><tbody>' + itemsHtml + '</tbody></table><div style="margin-top:16px;text-align:right;border-top:2px solid #e5e7eb;padding-top:12px"><p style="font-size:12px;color:#6b7280">Subtotal: ₵' + subtotal.toFixed(2) + '</p>' + (shipping > 0 ? '<p style="font-size:12px;color:#6b7280">Delivery: ₵' + shipping.toFixed(2) + '</p>' : '') + '<p style="font-size:18px;font-weight:bold;color:#0A2E60;margin-top:8px">TOTAL: ₵' + selectedOrder.total_amount?.toFixed(2) + '</p></div>' + (editableNote ? '<div style="margin-top:16px;padding:12px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a"><p style="font-size:12px;color:#92400e">' + editableNote + '</p></div>' : '') + '<div style="margin-top:20px;text-align:center;padding:16px;background:#f8fafc;border-radius:8px"><p style="font-size:13px;color:#6b7280">' + editableFooter + '</p><p style="font-size:11px;color:#9ca3af;margin-top:4px">WhatsApp: 0208207543 | fmmclassico@gmail.com</p></div></div></div></div>';

      await appClient.integrations.Core.SendEmail({
        to: selectedOrder.customer_email,
        from_name: 'FMM CLASSICO',
        subject: '🧾 Your Invoice – FMM CLASSICO Order #' + selectedOrder.order_number,
        body: emailBody,
      });

      toast.success('Invoice sent to ' + selectedOrder.customer_email);
    } catch (err) {
      console.error('Email send error:', err);
      toast.error('Failed to send email. Check email integration.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="p-8 text-center text-gray-500">Please log in.</div>;
  }

  if (!isAdmin) {
    return <div className="p-8 text-center"><h2 className="text-xl font-bold text-red-600">Access Denied</h2><p className="text-gray-500">Admins only.</p></div>;
  }

  const subtotal = selectedOrder?.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
  const shipping = selectedOrder ? selectedOrder.total_amount - subtotal : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileText className="h-6 w-6" /> Admin Invoices</h1>
        <p className="text-gray-500 text-sm">Select an order, edit the invoice, then send or print.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Order List - 2 columns */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {selectedInvoices.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}><Trash2 className="h-4 w-4 mr-1" /> Delete {selectedInvoices.length}</Button>
          )}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />) : filteredOrders.length === 0 ? <p className="text-center text-gray-400 py-8">No orders</p> : filteredOrders.map(order => (
              <Card key={order.id} onClick={() => { setSelectedOrder(order); setIsEditing(false); setEditableNote(''); }} className={'p-3 cursor-pointer transition-all hover:border-[#0A2E60]/50 ' + (selectedOrder?.id === order.id ? 'border-2 border-[#0A2E60] bg-blue-50' : '') + ' ' + (selectedInvoices.includes(order.id) ? 'bg-red-50 border-red-300' : '')}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedInvoices.includes(order.id)} onChange={() => handleToggleInvoice(order.id)} onClick={e => e.stopPropagation()} className="w-4 h-4" />
                  <span className="font-semibold text-sm">{order.order_number}</span>
                  {selectedOrder?.id === order.id && <CheckCircle2 className="h-4 w-4 text-[#0A2E60]" />}
                </div>
                <p className="text-sm text-gray-600 mt-1">{order.customer_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold">₵{order.total_amount?.toFixed(2)}</span>
                  <Badge variant="outline" className="text-xs">{order.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Invoice Preview + Editor - 3 columns */}
        <div className="lg:col-span-3">
          {!selectedOrder ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-xl">
              <FileText className="h-12 w-12 mb-2" />
              <p>Select an order to preview invoice</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex gap-2 flex-wrap items-center bg-white p-3 rounded-lg border shadow-sm">
                <Button onClick={handlePrint} variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" /> Print</Button>
                <Button onClick={handleSendEmail} disabled={sendingEmail} size="sm" className="bg-[#0A2E60] hover:bg-[#083050]"><Mail className="h-4 w-4 mr-1" /> {sendingEmail ? 'Sending...' : 'Email to Customer'}</Button>
                <div className="flex-1" />
                <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? 'default' : 'outline'} size="sm"><Edit3 className="h-4 w-4 mr-1" /> {isEditing ? 'Done Editing' : 'Edit Template'}</Button>
              </div>

              {/* Editor Panel */}
              {isEditing && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-bold text-yellow-800">✏️ Edit Invoice Before Sending</p>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Add Note (appears on invoice)</label>
                    <textarea className="w-full border rounded-lg p-2 text-sm mt-1" rows={2} placeholder="e.g. Payment due within 7 days..." value={editableNote} onChange={(e) => setEditableNote(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Footer Message</label>
                    <input className="w-full border rounded-lg p-2 text-sm mt-1" value={editableFooter} onChange={(e) => setEditableFooter(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Invoice Preview */}
              <div ref={invoiceRef} className="bg-white border rounded-xl overflow-hidden shadow-lg">
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #031725, #0A2E60)' }} className="p-6 text-center">
                  <h2 className="text-white font-bold text-xl">FMM CLASSICO</h2>
                  <p className="text-white/70 text-xs mt-1">Phones & Accessories · Electronics · Home Appliances</p>
                  <p className="text-white/60 text-[10px] mt-1">Tarkwa (UMAT Campus) & Accra (Ashongman Estate) | 0208207543</p>
                </div>

                <div className="p-6">
                  {/* Invoice Info */}
                  <div className="flex justify-between mb-4">
                    <div>
                      <h3 className="text-[#0A2E60] font-bold text-lg">INVOICE</h3>
                      <p className="text-sm font-semibold">#{selectedOrder.order_number}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.created_date ? format(new Date(selectedOrder.created_date), 'dd MMM yyyy, h:mm a') : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-600">Bill To:</p>
                      <p className="text-sm font-medium">{selectedOrder.customer_name}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.customer_email}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.customer_phone}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2.5 text-left text-xs font-semibold">Product</th>
                        <th className="p-2.5 text-center text-xs font-semibold">Qty</th>
                        <th className="p-2.5 text-right text-xs font-semibold">Price</th>
                        <th className="p-2.5 text-right text-xs font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="p-2.5 text-xs">{item.product_name}</td>
                          <td className="p-2.5 text-center text-xs">{item.quantity}</td>
                          <td className="p-2.5 text-right text-xs">₵{item.price?.toFixed(2)}</td>
                          <td className="p-2.5 text-right text-xs font-medium">₵{(item.price * item.quantity)?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-4 border-t-2 border-gray-200 pt-3 text-right">
                    <p className="text-xs text-gray-500">Subtotal: ₵{subtotal.toFixed(2)}</p>
                    {shipping > 0 && <p className="text-xs text-gray-500">Delivery: ₵{shipping.toFixed(2)}</p>}
                    <p className="text-lg font-bold text-[#0A2E60] mt-2">TOTAL: ₵{selectedOrder.total_amount?.toFixed(2)}</p>
                  </div>

                  {/* Custom Note */}
                  {editableNote && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">{editableNote}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-6 text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{editableFooter}</p>
                    <p className="text-[10px] text-gray-400 mt-1">WhatsApp: 0208207543 | fmmclassico@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
