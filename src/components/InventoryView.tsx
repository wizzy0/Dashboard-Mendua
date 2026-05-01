import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { Product, Category, RawMaterial, Ingredient } from '../types';
import { Plus, Search, Filter, Edit2, Trash2, AlertCircle, MoreVertical, X, Package, Droplets, Scale, Trash, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';

export default function InventoryView() {
  const [activeTab, setActiveTab] = useState<'products' | 'rawMaterials'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentData, setAdjustmentData] = useState({
    itemId: '',
    quantity: 0
  });

  // Product Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    sku: '',
    lowStockThreshold: 5,
    imageUrl: '',
    ingredients: [] as Ingredient[]
  });

  // Material Form State
  const [materialFormData, setMaterialFormData] = useState({
    name: '',
    stock: 0,
    unit: '',
    lowStockThreshold: 5
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(p);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const qMaterials = query(collection(db, 'rawMaterials'), orderBy('name'));
    const unsubscribeMaterials = onSnapshot(qMaterials, (snapshot) => {
      const m = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RawMaterial));
      setRawMaterials(m);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rawMaterials'));

    const qCat = query(collection(db, 'categories'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      const c = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(c);
    });

    return () => {
      unsubscribe();
      unsubscribeMaterials();
      unsubscribeCat();
    };
  }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'products'), data);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      resetProductForm();
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...materialFormData,
        updatedAt: serverTimestamp(),
      };

      if (editingMaterial) {
        await updateDoc(doc(db, 'rawMaterials', editingMaterial.id), data);
      } else {
        await addDoc(collection(db, 'rawMaterials'), data);
      }
      setIsModalOpen(false);
      setEditingMaterial(null);
      resetMaterialForm();
    } catch (error) {
      handleFirestoreError(error, editingMaterial ? OperationType.UPDATE : OperationType.CREATE, 'rawMaterials');
    }
  };

  const resetProductForm = () => {
    setFormData({ name: '', category: '', price: 0, stock: 0, sku: '', lowStockThreshold: 5, imageUrl: '', ingredients: [] });
  };

  const resetMaterialForm = () => {
    setMaterialFormData({ name: '', stock: 0, unit: '', lowStockThreshold: 5 });
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentData.itemId || adjustmentData.quantity <= 0) return;

    if (activeTab === 'rawMaterials') {
      const material = rawMaterials.find(m => m.id === adjustmentData.itemId);
      if (!material) return;

      try {
        const newStock = adjustmentType === 'add' 
          ? material.stock + adjustmentData.quantity
          : Math.max(0, material.stock - adjustmentData.quantity);

        await updateDoc(doc(db, 'rawMaterials', material.id), {
          stock: newStock,
          updatedAt: serverTimestamp()
        });

        setIsStockAdjustmentModalOpen(false);
        setAdjustmentData({ itemId: '', quantity: 0 });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'rawMaterials');
      }
    } else {
      const product = products.find(p => p.id === adjustmentData.itemId);
      if (!product) return;

      try {
        const newStock = adjustmentType === 'add' 
          ? product.stock + adjustmentData.quantity
          : Math.max(0, product.stock - adjustmentData.quantity);

        await updateDoc(doc(db, 'products', product.id), {
          stock: newStock,
          updatedAt: serverTimestamp()
        });

        setIsStockAdjustmentModalOpen(false);
        setAdjustmentData({ itemId: '', quantity: 0 });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'products');
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus produk ini?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'products');
      }
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus bahan baku ini?')) {
      try {
        await deleteDoc(doc(db, 'rawMaterials', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'rawMaterials');
      }
    }
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { rawMaterialId: '', name: '', quantity: 0, unit: '' }]
    });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = [...formData.ingredients];
    newIngredients.splice(index, 1);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const updateIngredient = (index: number, matId: string) => {
    const material = rawMaterials.find(m => m.id === matId);
    if (!material) return;
    
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = {
      ...newIngredients[index],
      rawMaterialId: material.id,
      name: material.name,
      unit: material.unit
    };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    (selectedCategory === 'All' || p.category === selectedCategory)
  );

  const filteredMaterials = rawMaterials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItemForAdjustment = activeTab === 'rawMaterials' 
    ? rawMaterials.find(m => m.id === adjustmentData.itemId)
    : products.find(p => p.id === adjustmentData.itemId);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex bg-earth-100 p-1 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('products')}
          className={cn(
            "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl font-bold transition-all text-sm sm:text-base",
            activeTab === 'products' ? "bg-white text-terracotta-900 shadow-sm" : "text-terracotta-400 hover:text-terracotta-600"
          )}
        >
          Produk
        </button>
        <button
          onClick={() => setActiveTab('rawMaterials')}
          className={cn(
            "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl font-bold transition-all text-sm sm:text-base",
            activeTab === 'rawMaterials' ? "bg-white text-terracotta-900 shadow-sm" : "text-terracotta-400 hover:text-terracotta-600"
          )}
        >
          Bahan Baku
        </button>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-terracotta-400" size={18} />
          <input
            type="text"
            placeholder={activeTab === 'products' ? "Cari produk..." : "Cari bahan baku..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-terracotta-100 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 focus:border-terracotta-500 transition-all shadow-sm"
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          {activeTab === 'products' && (
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white border border-terracotta-100 text-terracotta-700 outline-none shadow-sm cursor-pointer"
            >
              <option value="All">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          )}
          
          <button
            onClick={() => { 
                if (activeTab === 'products') {
                    setEditingProduct(null); 
                    resetProductForm();
                } else {
                    setEditingMaterial(null);
                    resetMaterialForm();
                }
                setIsModalOpen(true); 
            }}
            className="w-[163px] md:flex-none flex items-center justify-center gap-2 bg-terracotta-500 hover:bg-terracotta-600 text-white px-4 py-3 rounded-xl transition-all shadow-md shadow-terracotta-500/10"
          >
            <Plus size={20} />
            {activeTab === 'products' ? 'Tambah Produk' : 'Tambah Bahan'}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {activeTab === 'products' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const isLowStock = product.stock <= product.lowStockThreshold;
            return (
              <motion.div
                layout
                key={product.id}
                className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm hover:shadow-md transition-all relative group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    isLowStock ? "bg-red-50 text-red-600" : "bg-terracotta-50 text-terracotta-600"
                  )}>
                    {product.category}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                      onClick={() => { 
                        setEditingProduct(product); 
                        setFormData({
                            name: product.name,
                            category: product.category,
                            price: product.price,
                            stock: product.stock,
                            sku: product.sku || '',
                            lowStockThreshold: product.lowStockThreshold,
                            imageUrl: product.imageUrl || '',
                            ingredients: product.ingredients || []
                        }); 
                        setIsModalOpen(true); 
                      }}
                      className="p-2 text-terracotta-400 hover:text-terracotta-600 hover:bg-terracotta-50 rounded-lg"
                     >
                      <Edit2 size={16} />
                     </button>
                     <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                     >
                      <Trash2 size={16} />
                     </button>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-terracotta-900 mb-1">{product.name}</h4>
                <p className="text-terracotta-500 font-mono text-sm mb-4">{product.sku || '-'}</p>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-terracotta-400 uppercase font-bold tracking-tighter mb-1">Stock</p>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-2xl font-bold", isLowStock ? "text-red-500" : "text-terracotta-900")}>
                        {product.stock}
                      </span>
                      {isLowStock && (
                        <div className="bg-red-500 text-white p-1 rounded-full">
                          <AlertCircle size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-terracotta-400 uppercase font-bold tracking-tighter mb-1">Harga</p>
                    <span className="text-lg font-bold text-terracotta-900">{formatCurrency(product.price)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMaterials.map((material) => {
            const isLowStock = material.stock <= material.lowStockThreshold;
            return (
              <motion.div
                layout
                key={material.id}
                className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm hover:shadow-md transition-all relative group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-earth-50 rounded-full text-[10px] font-bold text-terracotta-600 uppercase">
                    <Droplets size={12} />
                    {material.unit}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                      onClick={() => { 
                        setEditingMaterial(material); 
                        setMaterialFormData({
                            name: material.name,
                            stock: material.stock,
                            unit: material.unit,
                            lowStockThreshold: material.lowStockThreshold
                        }); 
                        setIsModalOpen(true); 
                      }}
                      className="p-2 text-terracotta-400 hover:text-terracotta-600 hover:bg-terracotta-50 rounded-lg"
                     >
                      <Edit2 size={16} />
                     </button>
                     <button 
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                     >
                      <Trash2 size={16} />
                     </button>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-terracotta-900 mb-4">{material.name}</h4>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-terracotta-400 uppercase font-bold tracking-tighter mb-1">Current Stock</p>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-2xl font-bold", isLowStock ? "text-red-500" : "text-terracotta-900")}>
                        {material.stock} <span className="text-sm font-medium text-terracotta-400">{material.unit}</span>
                      </span>
                      {isLowStock && (
                        <div className="bg-red-500 text-white p-1 rounded-full animate-pulse">
                          <AlertCircle size={12} />
                        </div>
                      )}
                    </div>
                    {isLowStock && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">STOK BAHAN MENIPIS!</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-terracotta-400 uppercase font-bold tracking-tighter mb-1 flex items-center justify-end gap-1">
                        <Scale size={10} /> Min
                    </p>
                    <span className="text-sm font-bold text-terracotta-600">{material.lowStockThreshold} {material.unit}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating Action Buttons for Stock Adjustment */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button
           onClick={() => { setAdjustmentType('add'); setIsStockAdjustmentModalOpen(true); }}
           className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform hover:scale-110"
           title="Tambah Stok"
        >
           <Plus size={24} />
        </button>
        <button
           onClick={() => { setAdjustmentType('subtract'); setIsStockAdjustmentModalOpen(true); }}
           className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 transition-transform hover:scale-110"
           title="Kurangi Stok"
        >
           <Minus size={24} />
        </button>
      </div>

      {/* Stock Adjustment Modal */}
      <AnimatePresence>
        {isStockAdjustmentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStockAdjustmentModalOpen(false)}
              className="absolute inset-0 bg-terracotta-950/40 backdrop-blur-sm"
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-md p-8 relative shadow-2xl flex flex-col pt-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={cn("text-2xl font-bold", adjustmentType === 'add' ? "text-emerald-600" : "text-red-600")}>
                  {adjustmentType === 'add' ? 'Tambah Stok' : 'Kurangi Stok'} {activeTab === 'products' ? 'Produk' : 'Bahan'}
                </h3>
                <button type="button" onClick={() => setIsStockAdjustmentModalOpen(false)} className="p-2 hover:bg-earth-100 rounded-full transition-colors absolute top-6 right-6">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleStockAdjustment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-terracotta-700 ml-1">Pilih {activeTab === 'products' ? 'Produk' : 'Bahan Baku'}</label>
                  <select
                    required
                    value={adjustmentData.itemId}
                    onChange={(e) => setAdjustmentData({...adjustmentData, itemId: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="">Pilih {activeTab === 'products' ? 'Produk...' : 'Bahan...'}</option>
                    {activeTab === 'rawMaterials' 
                      ? rawMaterials.map(rm => (
                          <option key={rm.id} value={rm.id}>{rm.name} (Sisa: {rm.stock} {rm.unit})</option>
                        ))
                      : products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Sisa: {p.stock})</option>
                        ))
                    }
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-terracotta-700 ml-1">Jumlah {adjustmentType === 'add' ? 'Ditambahkan' : 'Dikurangi'}</label>
                  <div className="flex items-center gap-3">
                    <input
                      required
                      type="number"
                      min="1"
                      value={adjustmentData.quantity || ''}
                      onChange={(e) => setAdjustmentData({...adjustmentData, quantity: Number(e.target.value)})}
                      className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                      placeholder="Masukkan angka..."
                    />
                    {selectedItemForAdjustment && activeTab === 'rawMaterials' && (
                      <span className="text-sm font-bold text-terracotta-400 w-16 px-2">{(selectedItemForAdjustment as RawMaterial).unit}</span>
                    )}
                    {selectedItemForAdjustment && activeTab === 'products' && (
                      <span className="text-sm font-bold text-terracotta-400 w-16 px-2">Pcs</span>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    className={cn(
                        "w-full font-bold px-8 py-4 rounded-2xl transition-all shadow-lg text-white",
                        adjustmentType === 'add' 
                            ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" 
                            : "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                    )}
                  >
                    Konfirmasi {adjustmentType === 'add' ? 'Penambahan' : 'Pengurangan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-terracotta-950/40 backdrop-blur-sm"
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl p-8 relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-terracotta-900">
                  {activeTab === 'products' 
                    ? (editingProduct ? 'Edit Produk' : 'Tambah Produk Baru')
                    : (editingMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku')
                  }
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-earth-100 rounded-full transition-colors">
                  <X />
                </button>
              </div>

              <div className="overflow-y-auto pr-2">
                {activeTab === 'products' ? (
                  <form onSubmit={handleSaveProduct} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-terracotta-700 ml-1">Nama Produk</label>
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                          placeholder="Contoh: Es Kopi Mendua"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-terracotta-700 ml-1">Kategori</label>
                        <select
                          required
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                        >
                          <option value="">Pilih Kategori</option>
                          {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                          <option value="Minuman">Minuman</option>
                          <option value="Makanan">Makanan</option>
                          <option value="Camilan">Camilan</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-terracotta-700 ml-1">SKU / Kode</label>
                        <input
                          type="text"
                          value={formData.sku}
                          onChange={(e) => setFormData({...formData, sku: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                          placeholder="SKU-001"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-terracotta-700 ml-1">Harga (Rp)</label>
                        <input
                          required
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                          className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-terracotta-700 ml-1">Stok Manual (Opsional)</label>
                        <input
                          required
                          type="number"
                          value={formData.stock}
                          onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                          className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Ingredients Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-terracotta-900 uppercase tracking-wider">Komposisi Bahan Baku</h4>
                        <button
                          type="button"
                          onClick={addIngredient}
                          className="text-xs font-bold text-terracotta-500 hover:text-terracotta-700 flex items-center gap-1"
                        >
                          <Plus size={14} /> Tambah Bahan
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {formData.ingredients.map((ing, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:items-end bg-earth-50 p-4 rounded-2xl border border-terracotta-50">
                            <div className="flex-1 w-full space-y-1">
                              <label className="text-[10px] font-bold text-terracotta-400 uppercase">Pilih Bahan</label>
                              <select
                                value={ing.rawMaterialId}
                                onChange={(e) => updateIngredient(idx, e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white border border-terracotta-100 outline-none text-sm"
                              >
                                <option value="">Pilih Bahan Baku</option>
                                {rawMaterials.map(rm => (
                                  <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end gap-3 w-full sm:w-auto">
                              <div className="w-24 flex-1 sm:flex-none space-y-1">
                                <label className="text-[10px] font-bold text-terracotta-400 uppercase">Jumlah</label>
                                <input
                                  type="number"
                                  value={ing.quantity}
                                  onChange={(e) => {
                                    const newIng = [...formData.ingredients];
                                    newIng[idx].quantity = Number(e.target.value);
                                    setFormData({ ...formData, ingredients: newIng });
                                  }}
                                  className="w-full px-3 py-2 rounded-xl bg-white border border-terracotta-100 outline-none text-sm"
                                />
                              </div>
                              <div className="pb-2 text-xs font-bold text-terracotta-400 w-12">{ing.unit}</div>
                              <button
                                type="button"
                                onClick={() => removeIngredient(idx)}
                                className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {formData.ingredients.length === 0 && (
                          <p className="text-center py-4 text-sm text-terracotta-400 italic">Belum ada bahan baku ditambahkan</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 flex gap-3 sticky bottom-0 bg-white">
                       <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 px-8 py-4 rounded-2xl border border-terracotta-200 text-terracotta-700 font-bold hover:bg-earth-50 transition-all"
                       >
                        Batal
                       </button>
                       <button
                        type="submit"
                        className="flex-[2] bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-terracotta-500/20"
                       >
                        {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                       </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSaveMaterial} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-terracotta-700 ml-1">Nama Bahan Baku</label>
                        <input
                          required
                          type="text"
                          value={materialFormData.name}
                          onChange={(e) => setMaterialFormData({...materialFormData, name: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                          placeholder="Contoh: Biji Kopi Arabica"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-terracotta-700 ml-1">Satuan</label>
                        <input
                          required
                          type="text"
                          value={materialFormData.unit}
                          onChange={(e) => setMaterialFormData({...materialFormData, unit: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                          placeholder="Gr / Ml / Pcs"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-terracotta-700 ml-1">Stok Saat Ini</label>
                        <input
                          required
                          type="number"
                          value={materialFormData.stock}
                          onChange={(e) => setMaterialFormData({...materialFormData, stock: Number(e.target.value)})}
                          className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-terracotta-700 ml-1">Batas Stok Menipis (Alert)</label>
                        <input
                          required
                          type="number"
                          value={materialFormData.lowStockThreshold}
                          onChange={(e) => setMaterialFormData({...materialFormData, lowStockThreshold: Number(e.target.value)})}
                          className="w-full px-5 py-3 rounded-2xl bg-earth-50 border border-terracotta-100 focus:ring-2 focus:ring-terracotta-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-6 flex gap-3">
                       <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 px-8 py-4 rounded-2xl border border-terracotta-200 text-terracotta-700 font-bold hover:bg-earth-50 transition-all"
                       >
                        Batal
                       </button>
                       <button
                        type="submit"
                        className="flex-[2] bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-terracotta-500/20"
                       >
                        {editingMaterial ? 'Simpan Perubahan' : 'Tambah Bahan'}
                       </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
