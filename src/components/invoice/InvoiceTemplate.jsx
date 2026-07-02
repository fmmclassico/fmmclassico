import React from 'react';
import { format } from 'date-fns';

export default function InvoiceTemplate({ order, invoiceRef }) {
  var subtotal = order.items?.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0) || 0;
  var shipping = order.total_amount - subtotal;
  var invoiceDate = order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');
  var invoiceTime = order.created_date ? format(new Date(order.created_date), 'h:mm a') : format(new Date(), 'h:mm a');

  return (
    <div ref={invoiceRef} style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', background: 'white' }}>
      {/* Header */}
      <div style={{ background: '#2E86C1', color: 'white', padding: '24px', borderRadius: '12px 12px 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>FMM CLASSICO</h1>
            <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.85 }}>Phones & Accessories | Home Appliances | Electronics</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.85 }}>Accra, Kumasi & Tarkwa (UMaT Campus)</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.85 }}>Tel: 0208207543 | fmmclassico@gmail.com</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '10px', opacity: 0.7 }}>INVOICE</p>
            <p style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 'bold' }}>#{order.order_number}</p>
            <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.85 }}>Date: {invoiceDate}</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.85 }}>Time: {invoiceTime}</p>
          </div>
        </div>
      </div>

      {/* Bill To / Deliver To */}
      <div style={{ padding: '20px 24px', display: 'flex', gap: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>Bill To</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>{order.customer_name}</p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4b5563' }}>{order.customer_email}</p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4b5563' }}>{order.customer_phone}</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>Deliver To</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#4b5563' }}>{order.delivery_address}</p>
          {order.city && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4b5563' }}>{order.city}</p>}
          {order.notes && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>Note: {order.notes}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div style={{ padding: '16px 24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Product</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '50px' }}>Qty</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#374151', width: '80px' }}>Unit Price</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#374151', width: '80px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map(function(item, idx) {
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 12px', color: '#1f2937' }}>{item.product_name}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#4b5563' }}>{item.quantity}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4b5563' }}>GHS {item.price?.toFixed(2)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>GHS {(item.price * item.quantity)?.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', color: '#6b7280' }}>
            <span>Subtotal</span>
            <span>GHS {subtotal.toFixed(2)}</span>
          </div>
          {shipping > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', color: '#6b7280' }}>
              <span>Delivery Fee</span>
              <span>GHS {shipping.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: '16px', fontWeight: 'bold', color: '#1f2937', borderTop: '2px solid #2E86C1', marginTop: '8px' }}>
            <span>TOTAL</span>
            <span>GHS {order.total_amount?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div style={{ padding: '12px 24px', background: '#f0fdf4', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#15803d' }}>Payment Status: PAID</span>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#2E86C1', fontWeight: '600' }}>Thank you for shopping with FMM CLASSICO!</p>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>For enquiries: WhatsApp 0208207543 | fmmclassico@gmail.com</p>
        <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#9ca3af' }}>This is a computer-generated invoice. No signature required.</p>
      </div>
    </div>
  );
}
