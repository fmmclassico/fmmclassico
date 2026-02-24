import React from 'react';
import { format } from 'date-fns';

export default function InvoiceTemplate({ order, invoiceRef }) {
  const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  const shipping = order.total_amount - subtotal;

  return (
    <div ref={invoiceRef} className="bg-white p-8 max-w-2xl mx-auto font-sans text-gray-800" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-orange-500 pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-black text-orange-500 tracking-tight">FMM CLASSICO</h1>
          <p className="text-xs text-gray-500 mt-1">Phone Accessories · Electronics · Home Appliances</p>
          <p className="text-xs text-gray-500">Tarkwa (UMAT Campus) & Accra (Ashongman Estate)</p>
          <p className="text-xs text-gray-500">Tel: 0599 676 419 | fmmclassico@gmail.com</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-gray-700 uppercase tracking-widest">Invoice</div>
          <p className="text-sm font-bold text-gray-600 mt-1">#{order.order_number}</p>
          <p className="text-xs text-gray-400 mt-1">
            Date: {order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      {/* Bill To */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Bill To</p>
          <p className="font-bold text-gray-800">{order.customer_name}</p>
          <p className="text-sm text-gray-600">{order.customer_email}</p>
          <p className="text-sm text-gray-600">{order.customer_phone}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Deliver To</p>
          <p className="text-sm text-gray-600">{order.delivery_address}</p>
          <p className="text-sm text-gray-600">{order.city}</p>
          {order.notes && <p className="text-xs text-gray-400 mt-1">Note: {order.notes}</p>}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-6 text-sm">
        <thead>
          <tr className="bg-orange-500 text-white">
            <th className="text-left px-4 py-2 rounded-tl font-bold">Product</th>
            <th className="text-center px-4 py-2 font-bold">Qty</th>
            <th className="text-right px-4 py-2 font-bold">Unit Price</th>
            <th className="text-right px-4 py-2 rounded-tr font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="px-4 py-3 font-medium text-gray-800">{item.product_name}</td>
              <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
              <td className="px-4 py-3 text-right text-gray-600">₵{item.price?.toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800">₵{(item.price * item.quantity)?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-60">
          <div className="flex justify-between py-1 text-sm text-gray-600">
            <span>Subtotal</span>
            <span>₵{subtotal.toFixed(2)}</span>
          </div>
          {shipping > 0 && (
            <div className="flex justify-between py-1 text-sm text-gray-600">
              <span>Delivery Fee</span>
              <span>₵{shipping.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t-2 border-orange-500 mt-1 font-black text-base text-gray-900">
            <span>TOTAL</span>
            <span>₵{order.total_amount?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="mb-8">
        <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          'bg-orange-100 text-orange-700'
        }`}>
          Status: {order.status?.replace('_', ' ')}
        </span>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 text-center text-xs text-gray-400">
        <p className="font-semibold text-gray-500 mb-1">Thank you for shopping with FMM CLASSICO! 🧡</p>
        <p>For enquiries: WhatsApp 0599 676 419 | fmmclassico@gmail.com</p>
        <p className="mt-1">This is a computer-generated invoice — no signature required.</p>
      </div>
    </div>
  );
}