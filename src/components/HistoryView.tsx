import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { Order } from '../types';
import { ShoppingCart, Calendar, Search, Filter, Download, ChevronDown } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function HistoryView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
                <tr key={order.id} className="hover:bg-earth-50/50 transition-colors group">
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
    </div>
  );
}
