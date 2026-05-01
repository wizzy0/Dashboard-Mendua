import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Product, Order, RawMaterial } from '../types';
import { TrendingUp, ShoppingCart, Package, AlertTriangle, ChevronRight, ArrowUpRight, ArrowDownRight, History, Droplets } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { startOfDay } from 'date-fns';

export default function DashboardView({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<RawMaterial[]>([]);
  const [stats, setStats] = useState({
    revenue: 0,
    orderCount: 0,
    itemsSold: 0
  });

  useEffect(() => {
    // 1. Today's Orders
    const today = startOfDay(new Date());
    const qOrders = query(
      collection(db, 'orders'),
      where('createdAt', '>=', today),
      orderBy('createdAt', 'desc')
    );

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setTodayOrders(orders);
      
      const revenue = orders.reduce((sum, o) => sum + o.total, 0);
      const itemsSold = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
      
      setStats({
        revenue,
        orderCount: orders.length,
        itemsSold
      });
    });

    // 2. Low Stock Monitoring (Products)
    const qProducts = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      const low = all.filter(p => p.stock <= (p.lowStockThreshold || 5));
      setLowStockProducts(low);
    });

    // 3. Low Stock Monitoring (Materials)
    const qMaterials = query(collection(db, 'rawMaterials'));
    const unsubMaterials = onSnapshot(qMaterials, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RawMaterial));
      const low = all.filter(m => m.stock <= (m.lowStockThreshold || 5));
      setLowStockMaterials(low);
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubMaterials();
    };
  }, []);

  const totalLowStock = lowStockProducts.length + lowStockMaterials.length;

  const statCards = [
    { label: 'Penjualan Hari Ini', value: formatCurrency(stats.revenue), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pesanan Masuk', value: stats.orderCount, icon: ShoppingCart, color: 'bg-terracotta-50 text-terracotta-500' },
    { label: 'Menu Terjual', value: stats.itemsSold, icon: Package, color: 'bg-amber-50 text-amber-600' },
    { label: 'Alert Stok', value: totalLowStock, icon: AlertTriangle, color: 'bg-red-50 text-red-500' },
  ];

  return (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-3xl border border-terracotta-100 shadow-sm flex items-center gap-5"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", stat.color)}>
              <stat.icon size={26} />
            </div>
            <div>
              <p className="text-sm font-bold text-terracotta-400 uppercase tracking-wider mb-0.5">{stat.label}</p>
              <h3 className="text-2xl font-black text-terracotta-900 tracking-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <section className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-terracotta-950 flex items-center gap-3">
              <History size={20} />
              Transaksi Terbaru
            </h3>
            <button 
              onClick={() => onTabChange('history')}
              className="text-terracotta-500 text-sm font-bold hover:underline underline-offset-4 flex items-center gap-1"
            >
              Lihat Semua <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-terracotta-100 shadow-sm overflow-hidden">
             {todayOrders.length === 0 ? (
               <div className="p-12 text-center text-terracotta-300">Belum ada transaksi hari ini</div>
             ) : (
               <div className="divide-y divide-terracotta-50">
                  {todayOrders.slice(0, 5).map(order => (
                    <div key={order.id} className="p-6 flex items-center justify-between hover:bg-earth-50 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-earth-100 rounded-full flex items-center justify-center text-terracotta-950">
                             <ShoppingCart size={20} />
                          </div>
                          <div>
                             <p className="font-bold text-terracotta-900 tracking-tight">#{order.id.slice(-6).toUpperCase()}</p>
                             <p className="text-xs text-terracotta-400">
                                {order.createdAt instanceof Timestamp ? order.createdAt.toDate().toLocaleTimeString() : 'Baru saja'} • {order.items.length} item
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-terracotta-900">{formatCurrency(order.total)}</p>
                          <span className="text-[10px] font-bold uppercase text-terracotta-500 px-2 py-0.5 bg-terracotta-50 rounded-md">
                             {order.paymentMethod}
                          </span>
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </section>

        {/* Low Stock Alerts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-terracotta-950 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-500" />
              Stok Menipis
            </h3>
          </div>

          <div className="space-y-4">
             {lowStockProducts.length === 0 && lowStockMaterials.length === 0 ? (
               <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] text-center">
                  <p className="text-emerald-700 font-bold">🎉 Stok Aman!</p>
                  <p className="text-emerald-600/70 text-xs mt-1">Semua produk & bahan memiliki persediaan cukup.</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {/* Product Alerts */}
                 {lowStockProducts.map(product => (
                  <motion.div
                   initial={{ x: 20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   key={`prod-${product.id}`}
                   className="bg-white p-5 rounded-3xl border-l-4 border-amber-500 border-t border-r border-b border-terracotta-100 shadow-sm flex items-center gap-4"
                  >
                     <div className="flex-1">
                        <h4 className="font-bold text-terracotta-900 leading-tight">{product.name}</h4>
                        <p className="text-[10px] text-amber-600 mt-1 uppercase font-black tracking-wider">Produk Jualan</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-terracotta-400 uppercase mb-1">Sisa</p>
                        <p className="text-xl font-black text-amber-600 leading-none">{product.stock}</p>
                     </div>
                  </motion.div>
                 ))}

                 {/* Material Alerts */}
                 {lowStockMaterials.map(material => (
                  <motion.div
                   initial={{ x: 20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   key={`mat-${material.id}`}
                   className="bg-white p-5 rounded-3xl border-l-4 border-red-500 border-t border-r border-b border-terracotta-100 shadow-sm flex items-center gap-4"
                  >
                     <div className="flex-1">
                        <h4 className="font-bold text-terracotta-900 leading-tight">{material.name}</h4>
                        <p className="text-[10px] text-red-600 mt-1 uppercase font-black tracking-wider">Bahan Baku</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-terracotta-400 uppercase mb-1">Sisa</p>
                        <p className="text-xl font-black text-red-600 leading-none tracking-tighter">
                          {material.stock} <span className="text-xs font-bold">{material.unit}</span>
                        </p>
                     </div>
                  </motion.div>
                 ))}
               </div>
             )}

             {(lowStockProducts.length > 0 || lowStockMaterials.length > 0) && (
               <button 
                onClick={() => onTabChange('inventory')}
                className="w-full py-4 text-terracotta-500 font-bold text-sm bg-terracotta-50 hover:bg-terracotta-100 rounded-2xl transition-all"
               >
                Kelola Stok
               </button>
             )}
          </div>
        </section>
      </div>
    </div>
  );
}
