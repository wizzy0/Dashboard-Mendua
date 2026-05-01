import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Order } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { cn, formatCurrency } from '../lib/utils';
import { TrendingUp, Package, DollarSign, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';

export default function AnalysisView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year'>('day');

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const fetchedOrders = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Order[];
        setOrders(fetchedOrders);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'orders');
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-terracotta-500 font-medium">Memuat Analisis...</div>;
  }

  const completedOrders = orders.filter(o => o.status === 'completed');

  const todayDate = new Date();
  const todayKey = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' });

  const todayOrders = completedOrders.filter(o => {
    if (!o.createdAt?.toDate) return false;
    return o.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' }) === todayKey;
  });

  const dailyRevenueToday = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const groupedChartData = new Map<string, number>();
  completedOrders.forEach(order => {
    if (!order.createdAt?.toDate) return;
    const d = order.createdAt.toDate();
    let key = '';
    
    if (timeFilter === 'day') {
        key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } else if (timeFilter === 'week') {
        key = `Mg ${getWeekNumber(d)}, ${d.getFullYear()}`;
    } else if (timeFilter === 'month') {
        key = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } else if (timeFilter === 'year') {
        key = d.getFullYear().toString();
    }
    
    groupedChartData.set(key, (groupedChartData.get(key) || 0) + order.total);
  });
  
  const chartData = Array.from(groupedChartData.entries()).map(([date, total]) => ({ date, total })).reverse();

  // Payment Methods
  const paymentMethods = completedOrders.reduce((acc, order) => {
    const method = order.paymentMethod === 'cash' ? 'Tunai' : 'Digital (QRIS/EDC)';
    acc[method] = (acc[method] || 0) + order.total;
    return acc;
  }, {} as Record<string, number>);

  const paymentData = Object.entries(paymentMethods).map(([name, value]) => ({
    name,
    value
  }));

  // Top Products
  const productSales = completedOrders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productSales)
    .map(([name, quantity]) => ({ name, quantity: quantity as number }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Hari Ini */}
        <div>
          <h3 className="text-xl font-bold text-terracotta-900 mb-4 px-2">Ringkasan Hari Ini</h3>
          <div className="flex flex-col gap-4">
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="w-full bg-terracotta-900 p-6 rounded-3xl border border-terracotta-800 shadow-sm flex items-center gap-4 text-white">
              <div className="p-4 bg-terracotta-800 rounded-2xl text-terracotta-100">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-terracotta-300 uppercase tracking-wider">Pendapatan</p>
                <h3 className="text-2xl font-black mt-1">{formatCurrency(dailyRevenueToday)}</h3>
              </div>
            </motion.div>
            
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="w-full bg-white p-6 rounded-3xl border border-terracotta-100 shadow-sm flex items-center gap-4 overflow-hidden">
              <div className="p-4 bg-earth-100 rounded-2xl text-terracotta-600 shrink-0">
                <TrendingUp size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-terracotta-400 uppercase tracking-wider truncate">Transaksi</p>
                <h3 className="text-2xl font-black text-terracotta-900 mt-1 truncate">{todayOrders.length}</h3>
              </div>
            </motion.div>
            
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="w-full bg-white p-6 rounded-3xl border border-terracotta-100 shadow-sm flex items-center gap-4 overflow-hidden">
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shrink-0">
                <Package size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider truncate">Produk Terjual</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-1 truncate">
                  {todayOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)}
                </h3>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Keseluruhan */}
        <div>
          <h3 className="text-xl font-bold text-terracotta-900 mb-4 px-2">Total Keseluruhan</h3>
          <div className="flex flex-col gap-4">
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} transition={{delay:0.4}} className="w-full bg-white p-6 rounded-3xl border border-terracotta-100 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-terracotta-50 rounded-2xl text-terracotta-600">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-terracotta-400 uppercase tracking-wider">Total Pendapatan</p>
                <h3 className="text-2xl font-black text-terracotta-900 mt-1">{formatCurrency(totalRevenue)}</h3>
              </div>
            </motion.div>
            
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} transition={{delay:0.5}} className="w-full bg-white p-6 rounded-3xl border border-terracotta-100 shadow-sm flex items-center gap-4 overflow-hidden">
              <div className="p-4 bg-earth-100 rounded-2xl text-terracotta-600 shrink-0">
                <TrendingUp size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-terracotta-400 uppercase tracking-wider truncate">Total Transaksi</p>
                <h3 className="text-2xl font-black text-terracotta-900 mt-1 truncate">{completedOrders.length}</h3>
              </div>
            </motion.div>
            
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} transition={{delay:0.6}} className="w-full bg-white p-6 rounded-3xl border border-terracotta-100 shadow-sm flex items-center gap-4 overflow-hidden">
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shrink-0">
                <Package size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider truncate">Semua Produk</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-1 truncate">
                  {completedOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)}
                </h3>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay:0.7}} className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-terracotta-100 shadow-sm">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-terracotta-900">Tren Pendapatan</h3>
              <p className="text-sm text-terracotta-500">Grafik penjualan berdasarkan waktu</p>
            </div>
            <div className="flex bg-earth-50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
              {(['day', 'week', 'month', 'year'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    timeFilter === filter 
                      ? 'bg-white text-terracotta-900 shadow-sm' 
                      : 'text-terracotta-400 hover:text-terracotta-600'
                  }`}
                >
                  {filter === 'day' ? 'Harian' : filter === 'week' ? 'Mingguan' : filter === 'month' ? 'Bulanan' : 'Tahunan'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e2725b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#e2725b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eBE1" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#b89d97'}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#b89d97'}}
                    tickFormatter={(value) => `Rp${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#e2725b', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                    labelStyle={{ color: '#8a6a63', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#e2725b" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-terracotta-400 text-sm">Belum ada data penjualan</div>
            )}
          </div>
        </motion.div>

        <div className="space-y-6">
          <motion.div initial={{opacity:0, x:20}} animate={{opacity:1,x:0}} transition={{delay:0.8}} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-terracotta-100 shadow-sm">
            <h3 className="text-lg font-bold text-terracotta-900 mb-6">Produk Terlaris</h3>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-terracotta-50 flex items-center justify-center text-terracotta-600 font-bold text-xs">
                        #{i + 1}
                      </div>
                      <span className="font-medium text-terracotta-800">{p.name}</span>
                    </div>
                    <span className="font-bold text-terracotta-900">{p.quantity} <span className="text-[10px] text-terracotta-400 font-normal">terjual</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-terracotta-400 py-4 text-sm">Belum ada data produk</div>
            )}
          </motion.div>

          <motion.div initial={{opacity:0, x:20}} animate={{opacity:1,x:0}} transition={{delay:0.9}} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-terracotta-100 shadow-sm">
            <h3 className="text-lg font-bold text-terracotta-900 mb-6">Metode Pembayaran</h3>
            {paymentData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eBE1" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#b89d97'}} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#b89d97'}}
                      tickFormatter={(value) => `Rp${(value/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      cursor={{fill: '#fcfaf9'}}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Total']}
                    />
                    <Bar dataKey="value" fill="#e2725b" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-terracotta-400 py-4 text-sm">Belum ada data</div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

