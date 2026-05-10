import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { Order } from '../types';
import { ShoppingCart, Calendar, Search, Filter, Download, ChevronDown, X } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export default function HistoryView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const o = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(o);
    });
    return () => unsubscribe();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="bg-terracotta-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8">
         <div className="space-y-1">
            <p className="text-terracotta-200 text-sm font-bold uppercase tracking-[0.2em] mb-2 md:mb-0">Total Penjualan</p>
            <h2 className="text-4xl md:text-5xl font-black">{formatCurrency(totalRevenue)}</h2>
         </div>
         <div className="flex w-full md:w-auto gap-3 md:gap-4">
            <div className="flex-1 md:flex-none bg-white/10 backdrop-blur-md px-4 md:px-6 py-4 rounded-2xl md:rounded-3xl border border-white/10">
               <p className="text-white/60 text-[10px] font-bold uppercase mb-1">Transaksi</p>
               <p className="text-xl md:text-2xl font-bold">{filteredOrders.length}</p>
            </div>
            <div className="flex-1 md:flex-none bg-white/10 backdrop-blur-md px-4 md:px-6 py-4 rounded-2xl md:rounded-3xl border border-white/10">
               <p className="text-white/60 text-[10px] font-bold uppercase mb-1">Periode</p>
               <p className="text-xl md:text-2xl font-bold">Semua</p>
            </div>
         </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-terracotta-400" size={18} />
          <input
            type="text"
            placeholder="Cari ID Pesanan atau Menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-terracotta-100 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 shadow-sm"
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-terracotta-100 text-terracotta-700 px-5 py-3.5 rounded-2xl font-bold hover:bg-earth-50 transition-all shadow-sm">
            <Calendar size={18} />
            Pilih Tanggal
            <ChevronDown size={14} />
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-terracotta-100 text-terracotta-700 px-5 py-3.5 rounded-2xl font-bold hover:bg-earth-50 transition-all shadow-sm">
            <Download size={18} />
            Laporan
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-terracotta-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-earth-50 border-b border-terracotta-50">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-terracotta-400 tracking-wider">Transaksi</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-terracotta-400 tracking-wider">Tanggal & Waktu</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-terracotta-400 tracking-wider">Pelanggan</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-terracotta-400 tracking-wider">Item</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-terracotta-400 tracking-wider">Metode</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-terracotta-400 tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terracotta-50">
              {filteredOrders.map(order => (
                <tr 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className="hover:bg-earth-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-8 py-6">
                    <span className="font-bold text-terracotta-900 font-mono tracking-tighter">#{order.id.slice(-8).toUpperCase()}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-terracotta-900">
                      {order.createdAt instanceof Timestamp ? format(order.createdAt.toDate(), 'dd MMM yyyy', { locale: id }) : '-'}
                    </p>
                    <p className="text-xs text-terracotta-400">
                      {order.createdAt instanceof Timestamp ? format(order.createdAt.toDate(), 'HH:mm') : '-'}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-terracotta-900">
                      {order.customerName || 'Tanpa Nama'}
                    </p>
                    {order.notes && (
                      <p className="text-xs text-terracotta-500 mt-1 line-clamp-2" title={order.notes}>
                        <span className="font-semibold">Catatan:</span> {order.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-8 py-6 max-w-xs">
                    <p className="text-sm text-terracotta-700 truncate font-medium">
                      {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2.5 py-1 rounded-lg",
                      order.paymentMethod === 'cash' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {order.paymentMethod === 'cash' ? 'Tunai' : 'Digital'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-lg font-black text-terracotta-950">{formatCurrency(order.total)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOrders.length === 0 && (
          <div className="p-20 text-center text-terracotta-300 font-medium">
            Tidak ada data transaksi.
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-terracotta-950/40 backdrop-blur-sm"
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl p-6 md:p-8 w-full max-w-2xl relative shadow-xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-terracotta-100">
                <div>
                  <h2 className="text-xl font-bold text-terracotta-900">Detail Pesanan</h2>
                  <p className="text-sm font-mono text-terracotta-500 mt-1">
                    #{selectedOrder.id.toUpperCase()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-terracotta-400 hover:text-terracotta-600 bg-earth-50 p-2 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-6 flex-1">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-earth-50 rounded-xl p-4 border border-terracotta-100">
                    <p className="text-[10px] uppercase font-bold text-terracotta-400 mb-1">Pelanggan</p>
                    <p className="font-semibold text-terracotta-900">{selectedOrder.customerName || 'Tanpa Nama'}</p>
                  </div>
                  <div className="bg-earth-50 rounded-xl p-4 border border-terracotta-100">
                    <p className="text-[10px] uppercase font-bold text-terracotta-400 mb-1">Tanggal & Waktu</p>
                    <p className="font-semibold text-terracotta-900">
                      {selectedOrder.createdAt instanceof Timestamp 
                        ? format(selectedOrder.createdAt.toDate(), 'dd MMM yyyy, HH:mm', { locale: id }) 
                        : '-'}
                    </p>
                  </div>
                  <div className="bg-earth-50 rounded-xl p-4 border border-terracotta-100">
                    <p className="text-[10px] uppercase font-bold text-terracotta-400 mb-1">Status</p>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                      Selesai
                    </span>
                  </div>
                  <div className="bg-earth-50 rounded-xl p-4 border border-terracotta-100">
                    <p className="text-[10px] uppercase font-bold text-terracotta-400 mb-1">Metode Pembayaran</p>
                    <p className="font-semibold text-terracotta-900 capitalize">
                      {selectedOrder.paymentMethod === 'cash' ? 'Tunai' : 'Digital (QRIS)'}
                    </p>
                  </div>
                  {selectedOrder.notes && (
                    <div className="col-span-2 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                      <p className="text-[10px] uppercase font-bold text-yellow-600 mb-1">Catatan</p>
                      <p className="text-sm text-yellow-900">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-bold text-terracotta-900 mb-3">Item Pesanan</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white border border-terracotta-100 p-3 rounded-xl">
                        <div className="flex gap-3 items-center">
                          <div className="w-8 h-8 rounded-lg bg-earth-50 text-terracotta-600 font-bold flex items-center justify-center text-sm">
                            {item.quantity}x
                          </div>
                          <div>
                            <p className="font-semibold text-terracotta-900 text-sm">{item.name}</p>
                            <p className="text-xs text-terracotta-500">{formatCurrency(item.price)}</p>
                          </div>
                        </div>
                        <p className="font-bold text-sm text-terracotta-800">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-terracotta-50 rounded-xl p-5 border border-terracotta-100 space-y-2">
                  <div className="flex justify-between text-sm text-terracotta-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discount && selectedOrder.discount > 0 ? (
                    <div className="flex justify-between text-sm text-terracotta-600">
                      <span>Diskon</span>
                      <span className="text-red-500">-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  ) : null}
                  {selectedOrder.tax ? (
                    <div className="flex justify-between text-sm text-terracotta-600">
                      <span>Pajak</span>
                      <span>{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-lg font-black text-terracotta-900 pt-3 mt-1 border-t border-terracotta-200">
                    <span>Total Keseluruhan</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
