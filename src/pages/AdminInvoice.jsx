import React, { useState, useEffect, useRef, useMemo } from 'react';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Mail, Search, FileText, CheckCircle2, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

const DEFAULT_FOOTER = 'Thank you for shopping with FMM CLASSICO! 🧡';

const statusLabels = {
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getGrandTotal(order) {
  return toNumber(order?.grand_total, toNumber(order?.total_amount));
}

function getAmountPaidNow(order) {
  if (order?.amount_paid_now != null) return toNumber(order.amount_paid_now);
  if ((order?.payment_method || 'full_payment') === 'full_payment') return getGrandTotal(order);
  return toNumber(order?.total_amount);
}

function getBalanceDue(order) {
  return toNumber(order?.balance_due);
}

function hasRemainingBalance(order) {
  const method = order?.payment_method || 'full_payment';
  return (method === 'deposit_balance' || method === 'pay_on_delivery') && getBalanceDue(order) > 0;
}

function isRemainingBalancePaid(order) {
  if (!hasRemainingBalance(order)) return true;
  return order?.remaining_balance_paid === true;
}

function getPaymentMethodLabel(method) {
  if (method === 'deposit_balance') return 'Deposit + Balance on Delivery';
  if (method === 'pay_on_delivery') return 'Pay on Delivery';
  return 'Full Payment';
}

function getPaymentStatusLabel(order) {
  const method = order?.payment_method || 'full_payment';
  const initialPaid = order?.payment_status === 'paid';
  const remainingPaid = isRemainingBalancePaid(order);
  const balanceDue = getBalanceDue(order);

  if (method === 'full_payment') {
    return initialPaid ? 'Fully Paid' : 'Awaiting Full Payment';
  }

  if (!initialPaid) {
    return 'Awaiting Initial Payment';
  }

  if (remainingPaid) {
    return 'Fully Paid';
  }

  return `Initial Payment Received, ₵${balanceDue.toFixed(2)} outstanding`;
}

function getDefaultInvoiceNote(order) {
  const method = order?.payment_method || 'full_payment';
  const balanceDue = getBalanceDue(order);

  if (method === 'deposit_balance') {
    return `Payment method: Deposit + Balance on Delivery. Customer paid ₵${getAmountPaidNow(order).toFixed(2)} at checkout. The remaining ₵${balanceDue.toFixed(2)} must be paid in full before the product is handed over.`;
  }

  if (method === 'pay_on_delivery') {
    return `Payment method: Pay on Delivery. Customer paid ₵${getAmountPaidNow(order).toFixed(2)} at checkout. The outstanding ₵${balanceDue.toFixed(2)} must be paid in full before the product is handed over.`;
  }

  return `Payment method: Full Payment. Full payment of ₵${getGrandTotal(order).toFixed(2)} was requested online for this order.`;
}

function getPaymentArrangementLines(order) {
  const method = order?.payment_method || 'full_payment';
  const balanceDue = getBalanceDue(order);
  const remainingPaid = isRemainingBalancePaid(order);

  if (method === 'deposit_balance') {
    return [
      `Customer paid now: ₵${getAmountPaidNow(order).toFixed(2)}`,
      remainingPaid
        ? `Remaining balance of ₵${balanceDue.toFixed(2)} has been confirmed by admin.`
        : `Remaining balance due before handover: ₵${balanceDue.toFixed(2)}`,
      'Delivery fees are non-refundable under the selected payment terms.',
    ];
  }

  if (method === 'pay_on_delivery') {
    return [
      `Customer paid now: ₵${getAmountPaidNow(order).toFixed(2)}`,
      remainingPaid
        ? `Outstanding delivery-side balance of ₵${balanceDue.toFixed(2)} has been confirmed by admin.`
        : `Outstanding delivery-side balance due before handover: ₵${balanceDue.toFixed(2)}`,
      'If payment is not completed at delivery, the product should be returned under the selected payment terms.',
    ];
  }

  return [
    `Customer paid now: ₵${getAmountPaidNow(order).toFixed(2)}`,
    'No remaining balance is due for this order.',
  ];
}

function buildInvoiceEmailHtml(order, note, footer) {
  const subtotal = (order?.items || []).reduce((sum, item) => sum + (toNumber(item?.price) * toNumber(item?.quantity, 1)), 0);
  const grandTotal = getGrandTotal(order);
  const shipping = Math.max(grandTotal - subtotal, 0);
  const amountPaidNow = getAmountPaidNow(order);
  const balanceDue = getBalanceDue(order);
  const paymentMethodLabel = getPaymentMethodLabel(order?.payment_method);
  const paymentStatusLabel = getPaymentStatusLabel(order);
  const orderStatusLabel = statusLabels[order?.status] || order?.status || 'Confirmed';
  const arrangementLines = getPaymentArrangementLines(order)
    .map((line) => `<li style="margin-bottom:6px">${line}</li>`)
    .join('');
  const itemsHtml = (order?.items || []).map((item) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:13px">${item.product_name || 'Product'}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px">${toNumber(item.quantity, 1)}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px">₵${toNumber(item.price).toFixed(2)}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px">₵${(toNumber(item.price) * toNumber(item.quantity, 1)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="max-width:700px;margin:0 auto;font-family:Arial,sans-serif;background:#f8fafc;padding:20px;color:#1f2937">
      <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08)">
        <div style="background:linear-gradient(135deg,#031725,#0A2E60);color:white;padding:28px 30px;text-align:center">
          <h1 style="margin:0;font-size:24px">FMM CLASSICO</h1>
          <p style="opacity:0.82;font-size:12px;margin-top:6px">Phones & Accessories · Electronics · Home Appliances</p>
          <p style="opacity:0.74;font-size:11px;margin-top:4px">Tarkwa (UMAT Campus) & Accra (Ashongman Estate)</p>
        </div>
        <div style="padding:28px 30px">
          <div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:20px">
            <div>
              <h3 style="color:#0A2E60;margin:0 0 8px;font-size:18px">INVOICE</h3>
              <p style="font-size:13px;margin:0 0 4px"><strong>#${order.order_number}</strong></p>
              <p style="font-size:12px;color:#6b7280;margin:0">Date: ${order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy, h:mm a') : format(new Date(), 'dd MMM yyyy, h:mm a')}</p>
            </div>
            <div style="text-align:right">
              <p style="font-size:12px;font-weight:bold;margin:0 0 4px">Bill To:</p>
              <p style="font-size:13px;margin:0 0 2px">${order.customer_name || ''}</p>
              <p style="font-size:12px;color:#6b7280;margin:0 0 2px">${order.customer_email || ''}</p>
              <p style="font-size:12px;color:#6b7280;margin:0">${order.customer_phone || ''}</p>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:20px">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px">
              <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase">Payment Method</p>
              <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#0f172a">${paymentMethodLabel}</p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px">
              <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase">Payment Status</p>
              <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#0f172a">${paymentStatusLabel}</p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px">
              <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase">Order Status</p>
              <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#0f172a">${orderStatusLabel}</p>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <thead>
              <tr style="background:#f1f5f9">
                <th style="padding:10px;text-align:left;font-size:12px">Product</th>
                <th style="padding:10px;text-align:center;font-size:12px">Qty</th>
                <th style="padding:10px;text-align:right;font-size:12px">Price</th>
                <th style="padding:10px;text-align:right;font-size:12px">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div style="margin-top:20px;padding:16px;border:1px solid #dbeafe;background:#eff6ff;border-radius:12px">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1d4ed8">Payment Arrangement</p><ul style="margin:0;padding-left:18px;font-size:12px;color:#1e3a8a">${arrangementLines}</ul>
          </div>

          <div style="margin-top:20px;text-align:right;border-top:2px solid #e5e7eb;padding-top:16px">
            <p style="font-size:13px;margin-bottom:4px">Subtotal: ₵${subtotal.toFixed(2)}</p>
            ${shipping > 0 ? `<p style="font-size:13px;margin-bottom:4px">Delivery: ₵${shipping.toFixed(2)}</p>` : ''}
            <p style="font-size:13px;margin-bottom:4px">Paid now: ₵${amountPaidNow.toFixed(2)}</p>
            ${balanceDue > 0 ? `<p style="font-size:13px;margin-bottom:4px">Remaining balance: ₵${balanceDue.toFixed(2)}</p>` : ''}
            <p style="font-size:18px;font-weight:bold;color:#0A2E60;margin-top:8px">TOTAL: ₵${grandTotal.toFixed(2)}</p>
          </div>

          ${note ? `<div style="margin-top:20px;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px"><p style="font-size:12px;color:#92400e;margin:0">${note}</p></div>` : ''}

          <div style="margin-top:24px;text-align:center;padding:16px;background:#f8fafc;border-radius:12px">
            <p style="font-size:13px;color:#6b7280;margin:0">${footer}</p>
            <p style="font-size:11px;color:#9ca3af;margin:6px 0 0">WhatsApp: 0208207543 | fmmclassico@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export default function AdminInvoice() {
  const { user, isAuthenticated } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [search, setSearch] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [invoiceEdits, setInvoiceEdits] = useState({});
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
    if (orders.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    const orderNumber = params.get('order');

    if (orderId) {
      const found = orders.find((order) => order.id === orderId);
      if (found) {
        setSelectedOrderId(found.id);
        return;
      }
    }

    if (orderNumber) {
      const found = orders.find((order) => order.order_number === orderNumber);
      if (found) {
        setSelectedOrderId(found.id);
        return;
      }
    }

    if (!selectedOrderId && orders[0]) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) || null, [orders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrder) return;

    setInvoiceEdits((prev) => {
      if (prev[selectedOrder.id]) return prev;

      return {
        ...prev,
        [selectedOrder.id]: {
          note: getDefaultInvoiceNote(selectedOrder),
          footer: DEFAULT_FOOTER,
        },
      };
    });
  }, [selectedOrder]);

  const deleteOrdersMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map((id) => appClient.entities.Order.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setSelectedInvoices([]);
      if (selectedOrder && selectedInvoices.includes(selectedOrder.id)) setSelectedOrderId(null);
      toast.success('Deleted successfully');
    },
  });

  const handleToggleInvoice = (id) => {
    setSelectedInvoices((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);
  };

  const handleDeleteSelected = () => {
    if (selectedInvoices.length === 0) return;
    if (confirm(`Delete ${selectedInvoices.length} order(s)?`)) {
      deleteOrdersMutation.mutate(selectedInvoices);
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    order.customer_email?.toLowerCase().includes(search.toLowerCase())
  );

  const activeEdit = selectedOrder
    ? invoiceEdits[selectedOrder.id] || { note: getDefaultInvoiceNote(selectedOrder), footer: DEFAULT_FOOTER }
    : { note: '', footer: DEFAULT_FOOTER };

  const updateInvoiceEdit = (field, value) => {
    if (!selectedOrder) return;

    setInvoiceEdits((prev) => ({
      ...prev,
      [selectedOrder.id]: {
        note: prev[selectedOrder.id]?.note ?? getDefaultInvoiceNote(selectedOrder),
        footer: prev[selectedOrder.id]?.footer ?? DEFAULT_FOOTER,
        [field]: value,
      },
    }));
  };

  const handlePrint = () => {
    if (!selectedOrder) return;

    const printContent = invoiceRef.current?.innerHTML;
    const win = window.open('', '_blank');
    win.document.write('<html><head><title>Invoice - ' + selectedOrder.order_number + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937;background:white;padding:20px}table{width:100%;border-collapse:collapse}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:0}}</style></head><body>' + printContent + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleSendEmail = async () => {
    if (!selectedOrder) return;

    setSendingEmail(true);
    try {
      const emailBody = buildInvoiceEmailHtml(selectedOrder, activeEdit.note, activeEdit.footer);

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

  const subtotal = selectedOrder?.items?.reduce((sum, item) => sum + (toNumber(item?.price) * toNumber(item?.quantity, 1)), 0) || 0;
  const grandTotal = selectedOrder ? getGrandTotal(selectedOrder) : 0;
  const shipping = selectedOrder ? Math.max(grandTotal - subtotal, 0) : 0;
  const amountPaidNow = selectedOrder ? getAmountPaidNow(selectedOrder) : 0;
  const balanceDue = selectedOrder ? getBalanceDue(selectedOrder) : 0;
  const paymentMethodLabel = selectedOrder ? getPaymentMethodLabel(selectedOrder.payment_method) : '';
  const paymentStatusLabel = selectedOrder ? getPaymentStatusLabel(selectedOrder) : '';
  const orderStatusLabel = selectedOrder ? (statusLabels[selectedOrder.status] || selectedOrder.status) : '';
  const arrangementLines = selectedOrder ? getPaymentArrangementLines(selectedOrder) : [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileText className="h-6 w-6" /> Admin Invoices</h1>
        <p className="text-gray-500 text-sm">Select an order, edit the invoice, then send or print.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {selectedInvoices.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}><Trash2 className="h-4 w-4 mr-1" /> Delete {selectedInvoices.length}</Button>
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading ? Array(5).fill(0).map((_, index) => <Skeleton key={index} className="h-24 w-full" />) : filteredOrders.length === 0 ? <p className="text-center text-gray-400 py-8">No orders</p> : filteredOrders.map((order) => {
              const grand = getGrandTotal(order);
              const paymentMethod = getPaymentMethodLabel(order.payment_method);
              return (
                <Card
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setIsEditing(false);
                  }}
                  className={'p-3 cursor-pointer transition-all hover:border-[#0A2E60]/50 ' + (selectedOrder?.id === order.id ? 'border-2 border-[#0A2E60] bg-blue-50' : '') + ' ' + (selectedInvoices.includes(order.id) ? 'bg-red-50 border-red-300' : '')}
                >
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedInvoices.includes(order.id)} onChange={() => handleToggleInvoice(order.id)} onClick={(event) => event.stopPropagation()} className="w-4 h-4" />
                    <span className="font-semibold text-sm">{order.order_number}</span>
                    {selectedOrder?.id === order.id && <CheckCircle2 className="h-4 w-4 text-[#0A2E60]" />}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{order.customer_name}</p>
                  <p className="text-xs text-gray-500 mt-1">{paymentMethod}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold">₵{grand.toFixed(2)}</span>
                    <Badge variant="outline" className="text-xs">{statusLabels[order.status] || order.status}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3">
          {!selectedOrder ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-xl">
              <FileText className="h-12 w-12 mb-2" />
              <p>Select an order to preview invoice</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap items-center bg-white p-3 rounded-lg border shadow-sm">
                <Button onClick={handlePrint} variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" /> Print</Button>
                <Button onClick={handleSendEmail} disabled={sendingEmail} size="sm" className="bg-[#0A2E60] hover:bg-[#083050]"><Mail className="h-4 w-4 mr-1" /> {sendingEmail ? 'Sending...' : 'Email to Customer'}</Button>
                <div className="flex-1" />
                <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? 'default' : 'outline'} size="sm"><Edit3 className="h-4 w-4 mr-1" /> {isEditing ? 'Done Editing' : 'Edit Invoice'}</Button>
              </div>

              {isEditing && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-bold text-yellow-800">✏️ Edit Invoice Before Sending</p>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Payment / Delivery Note</label>
                    <textarea className="w-full border rounded-lg p-2 text-sm mt-1" rows={3} placeholder="Add a payment arrangement note..." value={activeEdit.note} onChange={(e) => updateInvoiceEdit('note', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Footer Message</label>
                    <input className="w-full border rounded-lg p-2 text-sm mt-1" value={activeEdit.footer} onChange={(e) => updateInvoiceEdit('footer', e.target.value)} />
                  </div>
                </div>
              )}

              <div ref={invoiceRef} className="bg-white border rounded-xl overflow-hidden shadow-lg">
                <div style={{ background: 'linear-gradient(135deg, #031725, #0A2E60)' }} className="p-6 text-center">
                  <h2 className="text-white font-bold text-xl">FMM CLASSICO</h2>
                  <p className="text-white/70 text-xs mt-1">Phones & Accessories · Electronics · Home Appliances</p>
                  <p className="text-white/60 text-[10px] mt-1">Tarkwa (UMAT Campus) & Accra (Ashongman Estate) | 0208207543</p>
                </div>

                <div className="p-6">
                  <div className="flex justify-between mb-4 gap-4 flex-wrap">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Payment method</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{paymentMethodLabel}</p>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Payment status</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{paymentStatusLabel}</p>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Order status</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{orderStatusLabel}</p>
                    </div>
                  </div>

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
                          <td className="p-2.5 text-center text-xs">{toNumber(item.quantity, 1)}</td>
                          <td className="p-2.5 text-right text-xs">₵{toNumber(item.price).toFixed(2)}</td>
                          <td className="p-2.5 text-right text-xs font-medium">₵{(toNumber(item.price) * toNumber(item.quantity, 1)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-bold text-blue-900 mb-2">Payment Arrangement</p><ul className="list-disc pl-4 space-y-1 text-xs text-blue-800">
                      {arrangementLines.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </div>

                  <div className="mt-4 border-t-2 border-gray-200 pt-3 text-right">
                    <p className="text-xs text-gray-500">Subtotal: ₵{subtotal.toFixed(2)}</p>
                    {shipping > 0 && <p className="text-xs text-gray-500">Delivery: ₵{shipping.toFixed(2)}</p>}
                    <p className="text-xs text-gray-500">Paid now: ₵{amountPaidNow.toFixed(2)}</p>
                    {balanceDue > 0 && <p className="text-xs text-orange-700">Remaining balance: ₵{balanceDue.toFixed(2)}</p>}
                    <p className="text-lg font-bold text-[#0A2E60] mt-2">TOTAL: ₵{grandTotal.toFixed(2)}</p>
                  </div>

                  {activeEdit.note && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">{activeEdit.note}</p>
                    </div>
                  )}

                  <div className="mt-6 text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{activeEdit.footer}</p>
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
