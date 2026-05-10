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
      <div className="flex border-b border-terracotta-100 w-full mb-4">
        <button
          onClick={() => setActiveTab('products')}
          className={cn(
            "px-6 py-2.5 font-medium transition-all text-sm",
            activeTab === 'products' ? "text-terracotta-600 border-b-2 border-terracotta-600" : "text-terracotta-400 hover:text-terracotta-600"
          )}
        >
          Daftar Produk
        </button>
        <button
          onClick={() => setActiveTab('rawMaterials')}
          className={cn(
            "px-6 py-2.5 font-medium transition-all text-sm",
            activeTab === 'rawMaterials' ? "text-terracotta-600 border-b-2 border-terracotta-600" : "text-terracotta-400 hover:text-terracotta-600"
          )}
        >
          Bahan Baku
        </button>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-terracotta-400" size={18} />
          <input
            type="text"
            placeholder={activeTab === 'products' ? "Cari produk..." : "Cari bahan baku..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-white border border-terracotta-200 focus:outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 transition-all text-sm"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          {activeTab === 'products' && (
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white border border-terracotta-200 text-terracotta-600 outline-none text-sm cursor-pointer"
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
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-terracotta-600 hover:bg-terracotta-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={16} />
            {activeTab === 'products' ? 'Tambah' : 'Tambah'}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {activeTab === 'products' ? (
        <div className="flex flex-col gap-2.5">
          {filteredProducts.map((product) => {
            const isLowStock = product.stock <= product.lowStockThreshold;
            return (
              <motion.div
                layout
                key={product.id}
                className="bg-white rounded border border-terracotta-200 hover:border-terracotta-400 transition-colors p-3 group flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-sm font-medium text-terracotta-900 truncate">{product.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-terracotta-500">{product.category}</p>
                    <span className="text-[10px] text-terracotta-300">•</span>
                    <p className="text-[10px] text-terracotta-400 font-mono">{product.sku || '-'}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn("text-[11px] font-medium flex items-center gap-1", isLowStock ? "text-red-500" : "text-terracotta-600")}>
                      Stok: {product.stock}
                      {isLowStock && <AlertCircle size={12} />}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-sm font-semibold text-terracotta-800">{formatCurrency(product.price)}</span>
                  <div className="flex gap-1">
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
                      className="p-1.5 text-terracotta-400 hover:text-terracotta-600 hover:bg-earth-50 rounded"
                     >
                      <Edit2 size={14} />
                     </button>
                     <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                     >
                      <Trash2 size={14} />
                     </button>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredMaterials.map((material) => {
            const isLowStock = material.stock <= material.lowStockThreshold;
            return (
              <motion.div
                layout
                key={material.id}
                className="bg-white rounded border border-terracotta-200 hover:border-terracotta-400 transition-colors p-3 group flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-sm font-medium text-terracotta-900 truncate">{material.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-terracotta-500 flex items-center gap-1">
                      <Droplets size={10} /> {material.unit}
                    </p>
                    <span className="text-[10px] text-terracotta-300">•</span>
                    <span className="text-[10px] text-terracotta-400">Min: {material.lowStockThreshold}</span>
                  </div>
                  <div className="mt-1">
                    <span className={cn("text-[11px] font-medium flex items-center gap-1", isLowStock ? "text-red-500" : "text-terracotta-600")}>
                      Stok: {material.stock} {material.unit}
                      {isLowStock && <AlertCircle size={12} />}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
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
                    className="p-1.5 text-terracotta-400 hover:text-terracotta-600 hover:bg-earth-50 rounded"
                   >
                    <Edit2 size={14} />
                   </button>
                   <button 
                    onClick={() => handleDeleteMaterial(material.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                   >
                    <Trash2 size={14} />
                   </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating Action Buttons for Stock Adjustment */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <button
           onClick={() => { setAdjustmentType('add'); setIsStockAdjustmentModalOpen(true); }}
           className="w-12 h-12 bg-white border border-terracotta-200 text-terracotta-700 hover:bg-earth-50 rounded-full flex items-center justify-center shadow-sm transition-colors"
           title="Tambah Stok"
        >
           <Plus size={20} />
        </button>
        <button
           onClick={() => { setAdjustmentType('subtract'); setIsStockAdjustmentModalOpen(true); }}
           className="w-12 h-12 bg-white border border-terracotta-200 text-terracotta-700 hover:bg-earth-50 rounded-full flex items-center justify-center shadow-sm transition-colors"
           title="Kurangi Stok"
        >
           <Minus size={20} />
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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl w-full max-w-sm p-6 relative shadow-lg flex flex-col"
            >
              <div className="flex items-center justify-between mb-5 border-b border-terracotta-50 pb-3">
                <h3 className="text-lg font-semibold text-terracotta-900">
                  {adjustmentType === 'add' ? 'Tambah Stok' : 'Kurangi Stok'}
                </h3>
                <button type="button" onClick={() => setIsStockAdjustmentModalOpen(false)} className="text-terracotta-400 hover:text-terracotta-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleStockAdjustment} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-terracotta-700">Pilih {activeTab === 'products' ? 'Produk' : 'Bahan Baku'}</label>
                  <select
                    required
                    value={adjustmentData.itemId}
                    onChange={(e) => setAdjustmentData({...adjustmentData, itemId: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none transition-all text-sm"
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

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-terracotta-700">Jumlah Modifikasi</label>
                  <div className="flex items-center gap-2">
                    <input
                      required
                      type="number"
                      min="1"
                      value={adjustmentData.quantity || ''}
                      onChange={(e) => setAdjustmentData({...adjustmentData, quantity: Number(e.target.value)})}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none text-sm"
                      placeholder="Angka..."
                    />
                    {selectedItemForAdjustment && activeTab === 'rawMaterials' && (
                      <span className="text-xs text-terracotta-500">{(selectedItemForAdjustment as RawMaterial).unit}</span>
                    )}
                    {selectedItemForAdjustment && activeTab === 'products' && (
                      <span className="text-xs text-terracotta-500">Pcs</span>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full font-medium py-2.5 rounded-lg transition-colors text-white bg-terracotta-600 hover:bg-terracotta-700 text-sm"
                  >
                    Simpan Perubahan
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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white/95 backdrop-blur-sm rounded-xl w-full max-w-2xl p-6 md:p-8 relative shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-5 border-b border-terracotta-50 pb-3">
                <h3 className="text-lg font-semibold text-terracotta-900">
                  {activeTab === 'products' 
                    ? (editingProduct ? 'Edit Produk' : 'Tambah Produk Baru')
                    : (editingMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku')
                  }
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-terracotta-400 hover:text-terracotta-600">
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto pr-2">
                {activeTab === 'products' ? (
                  <form onSubmit={handleSaveProduct} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="col-span-1 md:col-span-2 space-y-1.5">
                        <label className="text-xs font-medium text-terracotta-700">Nama Produk</label>
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 text-sm"
                          placeholder="Contoh: Es Kopi Mendua"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-terracotta-700">Kategori</label>
                        <select
                          required
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 text-sm"
                        >
                          <option value="">Pilih Kategori</option>
                          {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                          <option value="Minuman">Minuman</option>
                          <option value="Makanan">Makanan</option>
                          <option value="Camilan">Camilan</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-terracotta-700">SKU / Kode</label>
                        <input
                          type="text"
                          value={formData.sku}
                          onChange={(e) => setFormData({...formData, sku: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 text-sm"
                          placeholder="SKU-001"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-terracotta-700">Harga (Rp)</label>
                        <input
                          required
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-terracotta-700">Stok Manual</label>
                        <input
                          required
                          type="number"
                          value={formData.stock}
                          onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 text-sm"
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

                    <div className="pt-6 flex gap-3 mt-4 border-t border-terracotta-50 pt-4 bg-white/50 backdrop-blur-sm sticky bottom-0">
                       <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-2 rounded-lg border border-terracotta-200 text-terracotta-600 font-medium hover:bg-earth-50 transition-colors text-sm"
                       >
                        Batal
                       </button>
                       <button
                        type="submit"
                        className="flex-1 bg-terracotta-600 hover:bg-terracotta-700 text-white font-medium px-6 py-2 rounded-lg transition-colors text-sm"
                       >
                        {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                       </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSaveMaterial} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="col-span-1 md:col-span-2 space-y-1.5">
                        <label className="text-xs font-medium text-terracotta-700">Nama Bahan Baku</label>
                        <input
                          required
                          type="text"
                          value={materialFormData.name}
                          onChange={(e) => setMaterialFormData({...materialFormData, name: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 text-sm"
                          placeholder="Contoh: Biji Kopi Arabica"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-terracotta-700">Satuan</label>
                        <input
                          required
                          type="text"
                          value={materialFormData.unit}
                          onChange={(e) => setMaterialFormData({...materialFormData, unit: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 text-sm"
                          placeholder="Gr / Ml / Pcs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-terracotta-700">Stok Saat Ini</label>
                        <input
                          required
                          type="number"
                          value={materialFormData.stock}
                          onChange={(e) => setMaterialFormData({...materialFormData, stock: Number(e.target.value)})}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 text-sm"
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2 space-y-1.5">
                        <label className="text-xs font-medium text-terracotta-700">Batas Stok Menipis (Alert)</label>
                        <input
                          required
                          type="number"
                          value={materialFormData.lowStockThreshold}
                          onChange={(e) => setMaterialFormData({...materialFormData, lowStockThreshold: Number(e.target.value)})}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-terracotta-200 outline-none focus:border-terracotta-500 focus:ring-1 focus:ring-terracotta-500 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4 border-t border-terracotta-50 pt-4 bg-white/50 backdrop-blur-sm sticky bottom-0">
                       <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-2 rounded-lg border border-terracotta-200 text-terracotta-600 font-medium hover:bg-earth-50 transition-colors text-sm"
                       >
                        Batal
                       </button>
                       <button
                        type="submit"
                        className="flex-1 bg-terracotta-600 hover:bg-terracotta-700 text-white font-medium px-6 py-2 rounded-lg transition-colors text-sm"
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
