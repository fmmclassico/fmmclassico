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
import InvoiceTemplate from '../components/invoice/InvoiceTemplate';

export default function AdminInvoice() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const invoiceRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      }
    };
    checkAdmin();
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
    enabled: isAdmin,
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
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleSendEmail = async () => {
    if (!selectedOrder) return;
    setSendingEmail(true);
    const subtotal = selectedOrder.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
    const shipping = selectedOrder.total_amount - subtotal;

    const itemsHtml = selectedOrder.items?.map(item =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${item.product_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">₵${item.price?.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:bold;">₵${(item.price * item.quantity)?.toFixed(2)}</td>
      </tr>`
    ).join('');

    const emailBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
        <div style="background:#f97316;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;font-size:28px;font-weight:900;margin:0;">FMM CLASSICO</h1>
          <p style="color:#fed7aa;font-size:13px;margin:4px 0 0;">Phone Accessories · Electronics · Home Appliances</p>
        </div>
        <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
          <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
            <div>
              <p style="font-size:20px;font-weight:900;color:#374151;letter-spacing:2px;">INVOICE</p>
              <p style="color:#6b7280;font-size:13px;">#${selectedOrder.order_number}</p>
              <p style="color:#6b7280;font-size:13px;">Date: ${selectedOrder.created_date ? format(new Date(selectedOrder.created_date), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}</p>
            </div>
            <div style="text-align:right;">
              <p style="font-weight:bold;font-size:13px;color:#f97316;">Bill To</p>
              <p style="font-weight:bold;">${selectedOrder.customer_name}</p>
              <p style="color:#6b7280;font-size:13px;">${selectedOrder.customer_email}</p>
              <p style="color:#6b7280;font-size:13px;">${selectedOrder.customer_phone}</p>
            </div>
          </div>
          <table style="width:100%;margin-bottom:24px;border-collapse:collapse;">
            <thead>
              <tr style="background:#f97316;color:white;">
                <th style="padding:10px 12px;text-align:left;">Product</th>
                <th style="padding:10px 12px;text-align:center;">Qty</th>
                <th style="padding:10px 12px;text-align:right;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align:right;margin-bottom:24px;">
            <p style="color:#6b7280;font-size:13px;">Subtotal: ₵${subtotal.toFixed(2)}</p>
            ${shipping > 0 ? `<p style="color:#6b7280;font-size:13px;">Delivery Fee: ₵${shipping.toFixed(2)}</p>` : ''}
            <p style="font-size:18px;font-weight:900;color:#1f2937;border-top:2px solid #f97316;padding-top:8px;margin-top:8px;">TOTAL: ₵${selectedOrder.total_amount?.toFixed(2)}</p>
          </div>
          <div style="text-align:center;border-top:1px solid #e5e7eb;padding-top:16px;color:#9ca3af;font-size:12px;">
            <p style="font-weight:bold;color:#6b7280;">Thank you for shopping with FMM CLASSICO! 🧡</p>
            <p>WhatsApp: 0509 896 035 | fmmclassico@gmail.com</p>
            <p>Tarkwa (UMAT Campus) & Accra (Ashongman Estate)</p>
            <p style="margin-top:8px;">This is a computer-generated invoice — no signature required.</p>
          </div>
        </div>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: selectedOrder.customer_email,
      from_name: 'FMM CLASSICO',
      subject: `🧾 Your Invoice – FMM CLASSICO Order #${selectedOrder.order_number}`,
      body: emailBody,
    });

    setSendingEmail(false);
    toast.success(`Invoice sent to ${selectedOrder.customer_email}`);
  };

  if (!user) {
    return <div className="container mx-auto px-4 py-12 text-center text-gray-500">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-500">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        <FileText className="h-6 w-6 text-orange-500" />
        Invoices
      </h1>
      <p className="text-gray-500 text-sm mb-6">Select an order to generate and send its invoice.</p>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Order List */}
        <div className="md:col-span-2">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by order # or customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
            ) : filteredOrders.map(order => (
              <Card
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-3 cursor-pointer transition-all hover:border-orange-400 ${selectedOrder?.id === order.id ? 'border-2 border-orange-500 bg-orange-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-800">{order.order_number}</span>
                  {selectedOrder?.id === order.id && <CheckCircle2 className="h-4 w-4 text-orange-500" />}
                </div>
                <p className="text-xs text-gray-600">{order.customer_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-bold text-gray-800">₵{order.total_amount?.toFixed(2)}</span>
                  <Badge className="text-[10px] px-1.5 py-0" variant="secondary">
                    {order.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="md:col-span-3">
          {!selectedOrder ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 border-2 border-dashed rounded-xl py-20">
              <FileText className="h-12 w-12 mb-3 text-gray-300" />
              <p className="font-medium">Select an order to preview invoice</p>
            </div>
          ) : (
            <div>
              {/* Action Buttons */}
              <div className="flex gap-3 mb-4">
                <Button onClick={handlePrint} className="bg-orange-500 hover:bg-orange-600 gap-2">
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  variant="outline"
                  className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <Mail className="h-4 w-4" />
                  {sendingEmail ? 'Sending...' : `Email to Customer`}
                </Button>
              </div>

              {/* Invoice Preview Box */}
              <div className="border rounded-xl overflow-hidden shadow-md">
                <InvoiceTemplate order={selectedOrder} invoiceRef={invoiceRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}