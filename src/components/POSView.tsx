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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-8 h-auto lg:h-[calc(100vh-180px)] pt-2 md:pt-0">
      {/* Product Selection */}
      <div className="flex-[2] flex flex-col gap-4 md:gap-5 min-h-[500px] lg:min-h-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-terracotta-400" size={18} />
          <input
            type="text"
            placeholder="Cari menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-terracotta-200 focus:outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 transition-all text-sm shadow-sm"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                selectedCategory === 'all' 
                  ? "bg-terracotta-600 text-white" 
                  : "bg-white border border-terracotta-200 text-terracotta-600 hover:bg-terracotta-50"
              )}
            >
              Semua
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  selectedCategory === cat 
                    ? "bg-terracotta-600 text-white border-terracotta-600" 
                    : "bg-white border border-terracotta-200 text-terracotta-600 hover:bg-terracotta-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
          {filteredProducts.map(product => {
            const isLow = product.stock <= product.lowStockThreshold;
            return (
              <motion.button
                layout
                whileTap={{ scale: 0.98 }}
                key={product.id}
                onClick={() => addToCart(product)}
                className="w-full bg-white p-3 rounded-lg border border-terracotta-200 hover:border-terracotta-400 transition-colors text-left flex items-center justify-between group"
              >
                <div>
                  <h4 className="font-medium text-terracotta-900 text-sm">{product.name}</h4>
                  <p className="text-terracotta-500 text-[10px] mb-1">{product.category}</p>
                  <p className={cn("text-xs font-medium", isLow ? "text-red-500" : "text-terracotta-500")}>Stok: {product.stock}</p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                   <p className="text-terracotta-800 font-semibold text-sm">{formatCurrency(product.price)}</p>
                   <div className="px-2 py-1 rounded bg-terracotta-50 flex items-center gap-1 text-terracotta-600 text-[10px] font-medium border border-terracotta-100 group-hover:bg-terracotta-500 group-hover:text-white transition-colors">
                      <Plus size={12} /> Tambah
                   </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="flex-1 bg-white rounded-lg border border-terracotta-200 shadow-sm flex flex-col overflow-hidden min-h-[450px] lg:min-h-0">
        <div className="p-4 border-b border-terracotta-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <ShoppingBag className="text-terracotta-600" size={18} />
              <h3 className="font-semibold text-terracotta-900 text-sm">Pesanan Saat Ini</h3>
           </div>
           <button 
            onClick={() => setCart([])}
            className="text-terracotta-400 hover:text-red-500 text-xs font-medium transition-colors"
           >
            Bersihkan
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {cart.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <ShoppingBag size={32} className="mb-2 text-terracotta-300" />
                <p className="text-xs text-terracotta-900">Keranjang kosong</p>
             </div>
           ) : (
             cart.map(item => (
               <div key={item.id} className="flex gap-3 items-center py-2 border-b border-terracotta-50 last:border-0">
                  <div className="flex-1 min-w-0">
                     <p className="font-medium text-sm text-terracotta-900 truncate">{item.name}</p>
                     <p className="text-[10px] text-terracotta-500">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                     <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-earth-50 hover:bg-earth-100 text-terracotta-600 transition-colors"
                     >
                      <Minus size={12} />
                     </button>
                     <span className="font-medium text-xs text-terracotta-900 w-4 text-center">{item.quantity}</span>
                     <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-earth-50 hover:bg-earth-100 text-terracotta-600 transition-colors"
                     >
                      <Plus size={12} />
                     </button>
                  </div>
               </div>
             ))
           )}
        </div>

        <div className="p-4 border-t border-terracotta-100 space-y-4 shrink-0 bg-white">
           <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-terracotta-500">
                 <span>Subtotal</span>
                 <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-terracotta-500">
                 <span>Pajak (10%)</span>
                 <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-terracotta-900 pt-1.5 mt-1 border-t border-terracotta-50">
                 <span>Total</span>
                 <span>{formatCurrency(total)}</span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-2 pb-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border transition-all text-sm font-medium hover:bg-white",
                  paymentMethod === 'cash' ? "border-terracotta-500 bg-white shadow-sm text-terracotta-700" : "border-terracotta-100 bg-transparent text-terracotta-500"
                )}
              >
                <Banknote size={16} />
                <span>Tunai</span>
              </button>
              <button
                onClick={() => setPaymentMethod('digital')}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border transition-all text-sm font-medium hover:bg-white",
                  paymentMethod === 'digital' ? "border-terracotta-500 bg-white shadow-sm text-terracotta-700" : "border-terracotta-100 bg-transparent text-terracotta-500"
                )}
              >
                <CreditCard size={16} />
                <span>QRIS</span>
              </button>
           </div>

           <button
            disabled={cart.length === 0}
            onClick={() => setShowConfirmation(true)}
            className="w-full bg-terracotta-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-terracotta-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
           >
              Proses Bayar
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
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="bg-white rounded-xl p-6 max-w-sm w-full relative text-center shadow-lg"
            >
               <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
               </div>
               <h2 className="text-xl font-bold text-terracotta-900 mb-1">Transaksi Berhasil!</h2>
               <p className="text-terracotta-500 mb-6 text-sm">Pesanan #{lastOrder?.id.slice(-6).toUpperCase()} tersimpan.</p>
               
               <div className="bg-earth-50 rounded-xl p-4 mb-6 text-left space-y-2 border border-terracotta-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-terracotta-500">Total</span>
                    <span className="font-semibold text-terracotta-900">{formatCurrency(lastOrder?.total || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-terracotta-500">Pelanggan</span>
                    <span className="font-medium text-terracotta-900">{lastOrder?.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-terracotta-500">Metode</span>
                    <span className="font-medium text-terracotta-900 capitalize">{lastOrder?.paymentMethod}</span>
                  </div>
               </div>

               <button
                onClick={() => setShowSuccess(false)}
                className="w-full bg-terracotta-600 text-white font-medium py-3 rounded-lg hover:bg-terracotta-700 transition-colors"
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
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="bg-white rounded-xl p-6 max-w-md w-full relative shadow-lg flex flex-col max-h-[90vh]"
            >
               <div className="flex items-center justify-between mb-5 border-b border-terracotta-50 pb-3">
                 <h2 className="text-lg font-semibold text-terracotta-900">Konfirmasi Pembayaran</h2>
                 <button 
                  onClick={() => setShowConfirmation(false)}
                  className="text-terracotta-400 hover:text-terracotta-600"
                 >
                  Batal
                 </button>
               </div>

               <div className="overflow-y-auto pr-2 space-y-5 flex-1">
                 {/* Input Customer Name */}
                 <div className="space-y-1.5">
                   <label className="text-sm font-medium text-terracotta-700">Nama Pelanggan</label>
                   <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 text-terracotta-400" size={16} />
                     <input
                       type="text"
                       placeholder="Opsional..."
                       value={customerName}
                       onChange={(e) => setCustomerName(e.target.value)}
                       className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-terracotta-200 focus:outline-none focus:ring-1 focus:ring-terracotta-500 focus:border-terracotta-500 shadow-sm text-sm"
                     />
                   </div>
                 </div>

                 {/* Order List */}
                 <div>
                   <p className="text-xs font-semibold text-terracotta-500 mb-2">Item</p>
                   <div className="space-y-2">
                     {cart.map(item => (
                       <div key={item.id} className="flex justify-between items-center bg-earth-50/50 p-2.5 rounded-lg border border-terracotta-100">
                         <div>
                           <p className="font-medium text-sm text-terracotta-900">{item.name}</p>
                           <p className="text-xs text-terracotta-500">{item.quantity} x {formatCurrency(item.price)}</p>
                         </div>
                         <p className="font-semibold text-sm text-terracotta-700">{formatCurrency(item.price * item.quantity)}</p>
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* Summary */}
                 <div className="bg-earth-50/50 p-3 rounded-lg space-y-1.5 border border-terracotta-100">
                    <div className="flex justify-between text-xs text-terracotta-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-terracotta-600">
                      <span>Pajak (10%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-terracotta-900 pt-2 border-t border-terracotta-200 mt-1">
                      <span>Total Tagihan</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                 </div>
               </div>

               <div className="mt-5 pt-5 border-t border-terracotta-100 space-y-4">
                 <label 
                   className="flex items-start gap-2.5 cursor-pointer group"
                   onClick={() => setPaymentReceived(!paymentReceived)}
                 >
                   <div className={cn(
                     "w-5 h-5 rounded overflow-hidden border flex items-center justify-center transition-colors shrink-0 mt-0.5",
                     paymentReceived ? "bg-terracotta-600 border-terracotta-600 text-white" : "bg-white border-terracotta-300 text-transparent group-hover:border-terracotta-400"
                   )}>
                     <CheckCircle2 size={14} />
                   </div>
                   <span className="text-sm text-terracotta-700 leading-snug">
                     Status pembayaran telah lunas melalui <span className="font-semibold uppercase">{paymentMethod}</span>.
                   </span>
                 </label>

                 <button
                  disabled={!paymentReceived || isCheckingOut}
                  onClick={handleCheckout}
                  className="w-full bg-terracotta-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-terracotta-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                 >
                  {isCheckingOut ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>Konfirmasi Transaksi</>
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
