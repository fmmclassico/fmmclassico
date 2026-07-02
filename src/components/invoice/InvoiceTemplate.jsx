import React from 'react';
import { format } from 'date-fns';

export default function InvoiceTemplate({ order, invoiceRef }) {
  const merchantPhone = import.meta.env.VITE_MERCHANT_PHONE || '0208207543';
  const merchantEmail = import.meta.env.VITE_MERCHANT_EMAIL || 'fmmclassico@gmail.com';
  const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  const shipping = order.total_amount - subtotal;

  return (
    <div ref={invoiceRef} className="bg-white p-6 md:p-8 max-w-2xl mx-auto font-sans text-gray-800" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-blue-800 pb-5 mb-5">
        <div>
          <h1 className="text-lg font-black text-blue-800 tracking-tight">FMM CLASSICO</h1>
          <p className="text-[10px] text-gray-500 mt-0.5">Phones &amp; Accessories · Home Appliances · Electronics</p>
          <p className="text-[10px] text-gray-500">Accra, Kumasi &amp; Tarkwa (UMAT Campus)</p>
          <p className="text-[10px] text-gray-500">Tel: {merchantPhone} | {merchantEmail}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-gray-700 uppercase tracking-widest">Invoice</div>
          <p className="text-xs font-bold text-gray-600 mt-0.5">#{order.order_number}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Date: {order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      {/* Bill To / Deliver To */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Bill To</p>
          <p className="text-sm font-semibold text-gray-800">{order.customer_name}</p>
          <p className="text-xs text-gray-600">{order.customer_email}</p>
          <p className="text-xs text-gray-600">{order.customer_phone}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Deliver To</p>
          <p className="text-xs text-gray-600">{order.delivery_address}</p>
          <p className="text-xs text-gray-600">{order.city}</p>
          {order.notes && <p className="text-[10px] text-gray-400 mt-0.5">Note: {order.notes}</p>}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-5 text-xs">
        <thead>
          <tr className="bg-blue-800 text-white">
            <th className="text-left px-3 py-1.5 rounded-tl font-semibold">Product</th>
            <th className="text-center px-3 py-1.5 font-semibold">Qty</th>
            <th className="text-right px-3 py-1.5 font-semibold">Unit Price</th>
            <th className="text-right px-3 py-1.5 rounded-tr font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="px-3 py-2 font-medium text-gray-800 text-xs">{item.product_name}</td>
              <td className="px-3 py-2 text-center text-gray-600 text-xs">{item.quantity}</td>
              <td className="px-3 py-2 text-right text-gray-600 text-xs">₵{item.price?.toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-800 text-xs">₵{(item.price * item.quantity)?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-52">
          <div className="flex justify-between py-0.5 text-xs text-gray-600">
            <span>Subtotal</span>
            <span>₵{subtotal.toFixed(2)}</span>
          </div>
          {shipping > 0 && (
            <div className="flex justify-between py-0.5 text-xs text-gray-600">
              <span>Delivery Fee</span>
              <span>₵{shipping.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5 border-t-2 border-blue-800 mt-1 font-black text-sm text-gray-900">
            <span>TOTAL</span>
            <span>₵{order.total_amount?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="mb-6">
        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          'bg-blue-100 text-blue-800'
        }`}>
          Status: {order.status?.replace('_', ' ')}
        </span>
      </div>

      {/* Footer */}
      <div className="border-t pt-3 text-center text-[10px] text-gray-400">
        <p className="font-semibold text-gray-500 mb-0.5">Thank you for shopping with FMM CLASSICO!</p>
        <p>For enquiries: WhatsApp {merchantPhone} | {merchantEmail}</p>
      </div>
    </div>
  );
}
