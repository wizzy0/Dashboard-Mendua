import React from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

interface ReceiptProps {
  order: Order | null;
}

export default function Receipt({ order }: ReceiptProps) {
  if (!order) return null;

  const content = (
    <div className="print-only" id="printable-receipt">
      <div className="text-center mb-4">
        <h2 className="font-bold text-lg mb-1">Kedai Mendua</h2>
        <p className="text-sm">Jalan Badak Agung</p>
        <p className="text-xs mt-1 border-b pb-2 border-black border-dashed">
          {order.createdAt instanceof Timestamp 
            ? format(order.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: id }) 
            : new Date().toLocaleString()}
        </p>
      </div>

      <div className="mb-3 text-sm">
        <div className="flex justify-between">
          <span>Struk:</span>
          <span>#{order.id.slice(-6).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Pelanggan:</span>
          <span className="font-semibold">{order.customerName || 'Tanpa Nama'}</span>
        </div>
        <div className="flex justify-between">
          <span>Metode:</span>
          <span className="capitalize">{order.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}</span>
        </div>
        {order.notes && (
          <div className="mt-1 pb-1">
            <span>Catatan:</span>
            <div className="font-medium text-xs mt-0.5">{order.notes}</div>
          </div>
        )}
      </div>

      <div className="border-t border-black border-dashed pt-2 mb-2">
        <table className="w-full text-sm">
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1">
                  <div>{item.name}</div>
                  <div className="text-xs">
                    {item.quantity} x {formatCurrency(item.price)}
                  </div>
                </td>
                <td className="text-right align-bottom py-1">
                  {formatCurrency(item.quantity * item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-black border-dashed pt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        {order.discount && order.discount > 0 ? (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-{formatCurrency(order.discount)}</span>
          </div>
        ) : null}
        {order.tax && order.tax > 0 ? (
          <div className="flex justify-between">
            <span>Pajak</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-bold mt-2 pt-2 border-t border-black border-dashed text-base">
          <span>TOTAL</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>

      <div className="text-center mt-6 pt-4 border-t border-black border-dashed pb-8">
        <p className="font-bold">Terima Kasih!</p>
        <p className="text-xs mt-1">Silakan datang kembali</p>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
