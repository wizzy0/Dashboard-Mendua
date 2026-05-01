import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../services/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, getDoc, runTransaction } from 'firebase/firestore';
import { Product, CartItem, Order } from '../types';
import { Search, Plus, Minus, Trash2, ShoppingBag, CreditCard, Banknote, User, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';

export default function POSView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(p.filter(prod => prod.stock > 0));
    });
    return () => unsubscribe();
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stock) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Collect all required raw material IDs
        const requiredMaterials = new Map<string, number>();
        cart.forEach(item => {
            if (item.ingredients) {
                item.ingredients.forEach(ing => {
                    const current = requiredMaterials.get(ing.rawMaterialId) || 0;
                    requiredMaterials.set(ing.rawMaterialId, current + (ing.quantity * item.quantity));
                });
            }
        });

        // 2. Fetch all products and raw materials involved
        const productRefs = cart.map(item => doc(db, 'products', item.id));
        const materialRefs = Array.from(requiredMaterials.keys()).map(id => doc(db, 'rawMaterials', id));
        
        const [productSnapshots, materialSnapshots] = await Promise.all([
            Promise.all(productRefs.map(ref => transaction.get(ref))),
            Promise.all(materialRefs.map(ref => transaction.get(ref)))
        ]);

        // 3. Verify Product Stocks
        productSnapshots.forEach((snap, idx) => {
          const product = snap.data() as Product;
          if (product.stock < cart[idx].quantity) {
             throw new Error(`Stok produk ${product.name} tidak mencukupi!`);
          }
        });

        // 4. Verify Raw Material Stocks
        materialSnapshots.forEach((snap) => {
            const material = snap.data() as any;
            const required = requiredMaterials.get(snap.id) || 0;
            if (material.stock < required) {
                throw new Error(`Bahan baku ${material.name} tidak mencukupi (Butuh ${required}, Sisa ${material.stock})!`);
            }
        });

        // 5. Create Order
        const orderData = {
          items: cart,
          subtotal,
          tax,
          total,
          paymentMethod,
          customerName: customerName || 'Tanpa Nama',
          status: 'completed',
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || 'anonymous'
        };
        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, orderData);

        // 6. Update Product Stocks
        cart.forEach((item) => {
          const ref = doc(db, 'products', item.id);
          const snap = productSnapshots.find(s => s.id === item.id);
          const currentStock = snap?.data()?.stock;
          transaction.update(ref, { 
            stock: currentStock - item.quantity,
            updatedAt: serverTimestamp()
          });
        });

        // 7. Update Raw Material Stocks
        materialSnapshots.forEach((snap) => {
            const ref = doc(db, 'rawMaterials', snap.id);
            const currentStock = snap.data()?.stock;
            const deduction = requiredMaterials.get(snap.id) || 0;
            transaction.update(ref, {
                stock: currentStock - deduction,
                updatedAt: serverTimestamp()
            });
        });

        setLastOrder({ ...orderData, id: orderRef.id } as Order);
      });

      setShowConfirmation(false);
      setShowSuccess(true);
      setCart([]);
      setCustomerName('');
      setPaymentReceived(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Terjadi kesalahan saat checkout');
      console.error(error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-8 h-auto lg:h-[calc(100vh-180px)] pt-2 md:pt-0">
      {/* Product Selection */}
      <div className="flex-[2] flex flex-col gap-4 md:gap-6 min-h-[500px] lg:min-h-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-terracotta-400" size={20} />
          <input
            type="text"
            placeholder="Cari Menu / Scan Barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none shadow-sm transition-all text-lg"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const isLow = product.stock <= product.lowStockThreshold;
            return (
              <motion.button
                layout
                whileTap={{ scale: 0.98 }}
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-5 rounded-3xl border border-terracotta-100 shadow-sm hover:border-terracotta-500/50 hover:shadow-md transition-all text-left flex flex-col justify-between group h-[200px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-terracotta-500 uppercase tracking-widest bg-earth-100 px-2.5 py-1 rounded-full">
                      {product.category}
                    </span>
                    {isLow && (
                       <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">Limit</span>
                    )}
                  </div>
                  <h4 className="font-bold text-terracotta-900 mb-1 leading-tight">{product.name}</h4>
                  <p className="text-terracotta-400 text-xs font-medium mb-4">Stok: {product.stock}</p>
                </div>
                <div className="flex items-center justify-between">
                   <p className="text-terracotta-500 font-bold">{formatCurrency(product.price)}</p>
                   <div className="w-8 h-8 rounded-full bg-terracotta-50 group-hover:bg-terracotta-500 flex items-center justify-center text-terracotta-500 group-hover:text-white transition-colors">
                      <Plus size={18} />
                   </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="flex-1 bg-white rounded-3xl md:rounded-[2.5rem] border border-terracotta-100 shadow-xl flex flex-col overflow-hidden min-h-[450px] lg:min-h-0">
        <div className="p-4 md:p-6 border-b border-terracotta-50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <ShoppingBag className="text-terracotta-600" />
              <h3 className="text-xl font-bold text-terracotta-900">Keranjang</h3>
           </div>
           <button 
            onClick={() => setCart([])}
            className="text-terracotta-400 hover:text-red-500 text-xs font-bold uppercase transition-colors"
           >
            Kosongkan
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
           {cart.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <ShoppingBag size={48} className="mb-4 text-terracotta-200" />
                <p className="text-terracotta-900 font-medium tracking-tight">Belum ada pesanan</p>
             </div>
           ) : (
             cart.map(item => (
               <div key={item.id} className="flex gap-4 items-center">
                  <div className="flex-1">
                     <p className="font-bold text-terracotta-900 leading-tight">{item.name}</p>
                     <p className="text-sm text-terracotta-500">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-earth-50 rounded-xl p-1 border border-terracotta-50">
                     <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-terracotta-600"
                     >
                      <Minus size={16} />
                     </button>
                     <span className="font-bold text-terracotta-900 w-4 text-center">{item.quantity}</span>
                     <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-terracotta-600"
                     >
                      <Plus size={16} />
                     </button>
                  </div>
               </div>
             ))
           )}
        </div>

        <div className="p-5 md:p-8 bg-earth-50/50 border-t border-terracotta-100 space-y-4 shrink-0">
           <div className="space-y-2">
              <div className="flex justify-between text-sm text-terracotta-600">
                 <span>Subtotal</span>
                 <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-terracotta-600">
                 <span>Pajak (10%)</span>
                 <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-xl font-black text-terracotta-900 pt-2 border-t border-terracotta-100 mt-2">
                 <span>Total</span>
                 <span>{formatCurrency(total)}</span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3 pb-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all",
                  paymentMethod === 'cash' ? "border-terracotta-500 bg-white shadow-md text-terracotta-900" : "border-transparent bg-white/50 text-terracotta-400"
                )}
              >
                <Banknote size={20} />
                <span className="text-[10px] font-bold uppercase">Tunai</span>
              </button>
              <button
                onClick={() => setPaymentMethod('digital')}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all",
                  paymentMethod === 'digital' ? "border-terracotta-500 bg-white shadow-md text-terracotta-900" : "border-transparent bg-white/50 text-terracotta-400"
                )}
              >
                <CreditCard size={20} />
                <span className="text-[10px] font-bold uppercase">QRIS / EDC</span>
              </button>
           </div>

           <button
            disabled={cart.length === 0}
            onClick={() => setShowConfirmation(true)}
            className="w-full bg-terracotta-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-terracotta-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-terracotta-500/30 flex items-center justify-center gap-2 text-lg active:scale-95 transition-all outline-none"
           >
              <>
                <ShoppingBag size={22} />
                Lanjut
              </>
           </button>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-terracotta-950/40 backdrop-blur-md"
            ></motion.div>
            <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white rounded-[3rem] p-10 max-w-sm w-full relative text-center shadow-2xl"
            >
               <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={48} />
               </div>
               <h2 className="text-3xl font-black text-terracotta-900 mb-2">Pembayaran Berhasil!</h2>
               <p className="text-terracotta-500 mb-8 font-medium">Transaksi #{lastOrder?.id.slice(-6).toUpperCase()} telah tercatat.</p>
               
               <div className="bg-earth-50 rounded-2xl p-5 mb-8 text-left space-y-2 border border-terracotta-50">
                  <div className="flex justify-between text-sm">
                    <span className="text-terracotta-400">Total Dibayar</span>
                    <span className="font-bold text-terracotta-900">{formatCurrency(lastOrder?.total || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-terracotta-400">Atas Nama</span>
                    <span className="font-bold text-terracotta-900">{lastOrder?.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-terracotta-400">Metode</span>
                    <span className="font-bold text-terracotta-900 capitalize">{lastOrder?.paymentMethod}</span>
                  </div>
               </div>

               <button
                onClick={() => setShowSuccess(false)}
                className="w-full bg-terracotta-950 text-white font-bold py-4 rounded-xl hover:bg-black transition-all"
               >
                Selesai
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCheckingOut && setShowConfirmation(false)}
              className="absolute inset-0 bg-terracotta-950/40 backdrop-blur-md"
            ></motion.div>
            <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white rounded-[2rem] p-8 max-w-lg w-full relative shadow-2xl flex flex-col max-h-[90vh]"
            >
               <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-black text-terracotta-900">Konfirmasi Pesanan</h2>
                 <button 
                  onClick={() => setShowConfirmation(false)}
                  className="text-terracotta-400 hover:text-terracotta-700"
                 >
                  Batal
                 </button>
               </div>

               <div className="overflow-y-auto pr-2 space-y-6 flex-1">
                 {/* Input Customer Name */}
                 <div className="space-y-2">
                   <label className="text-sm font-bold text-terracotta-700 ml-1">Nama Pemesan</label>
                   <div className="relative">
                     <User className="absolute left-4 top-1/2 -translate-y-1/2 text-terracotta-400" size={18} />
                     <input
                       type="text"
                       placeholder="Masukkan Nama Pelanggan"
                       value={customerName}
                       onChange={(e) => setCustomerName(e.target.value)}
                       className="w-full pl-11 pr-4 py-3 rounded-xl bg-earth-50 border border-terracotta-100 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 shadow-sm"
                     />
                   </div>
                 </div>

                 {/* Order List */}
                 <div>
                   <p className="text-sm font-bold text-terracotta-400 uppercase mb-3">Rincian Pesanan</p>
                   <div className="space-y-3">
                     {cart.map(item => (
                       <div key={item.id} className="flex justify-between items-center bg-earth-50 p-3 rounded-xl border border-terracotta-50">
                         <div>
                           <p className="font-bold text-terracotta-900">{item.name}</p>
                           <p className="text-xs text-terracotta-500">{item.quantity} x {formatCurrency(item.price)}</p>
                         </div>
                         <p className="font-bold text-terracotta-700">{formatCurrency(item.price * item.quantity)}</p>
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* Summary */}
                 <div className="bg-terracotta-50 p-4 rounded-xl space-y-2 border border-terracotta-100">
                    <div className="flex justify-between text-sm text-terracotta-700">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-terracotta-700">
                      <span>Pajak (10%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between font-black text-lg text-terracotta-900 pt-2 border-t border-terracotta-200 mt-2">
                      <span>Total Tagihan</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-terracotta-700 pt-1">
                      <span>Metode Pembayaran</span>
                      <span className="uppercase font-bold">{paymentMethod}</span>
                    </div>
                 </div>
               </div>

               <div className="mt-6 pt-6 border-t border-terracotta-100 space-y-4">
                 <label 
                   className="flex items-center gap-3 cursor-pointer group"
                   onClick={() => setPaymentReceived(!paymentReceived)}
                 >
                   <div className={cn(
                     "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors shrink-0",
                     paymentReceived ? "bg-terracotta-500 border-terracotta-500 text-white" : "border-terracotta-200 text-transparent"
                   )}>
                     <CheckCircle2 size={16} />
                   </div>
                   <span className="font-medium text-terracotta-900 select-none group-hover:text-terracotta-700">
                     Saya mengonfirmasi bahwa pelanggan telah membayar pesanan ini ({paymentMethod === 'cash' ? 'Tunai' : 'QRIS/Digital'}).
                   </span>
                 </label>

                 <button
                  disabled={!paymentReceived || isCheckingOut}
                  onClick={handleCheckout}
                  className="w-full bg-terracotta-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-terracotta-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                 >
                  {isCheckingOut ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>Eksekusi Pesanan</>
                  )}
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
