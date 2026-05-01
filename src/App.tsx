import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DashboardView from './components/DashboardView';
import POSView from './components/POSView';
import InventoryView from './components/InventoryView';
import HistoryView from './components/HistoryView';
import AnalysisView from './components/AnalysisView';
import { db, auth } from './services/firebase';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Product, RawMaterial, Notification } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Global notification check for low stock
    const qProducts = query(collection(db, 'products'));
    const qMaterials = query(collection(db, 'rawMaterials'));

    let productsList: Product[] = [];
    let materialsList: RawMaterial[] = [];

    const updateNotifications = () => {
      const lowProducts = productsList.filter(p => p.stock <= (p.lowStockThreshold || 5));
      const lowMaterials = materialsList.filter(m => m.stock <= (m.lowStockThreshold || 5));
      
      const newNotifications: Notification[] = [];
      
      lowProducts.forEach(p => {
        newNotifications.push({
          id: `prod-${p.id}`,
          title: 'Stok Produk Menipis',
          message: `Stok ${p.name} tersisa ${p.stock}`,
          type: p.stock === 0 ? 'error' : 'warning',
          read: false,
          createdAt: p.updatedAt || Timestamp.now()
        });
      });

      lowMaterials.forEach(m => {
        newNotifications.push({
          id: `mat-${m.id}`,
          title: 'Stok Bahan Baku Menipis',
          message: `Stok ${m.name} tersisa ${m.stock} ${m.unit}`,
          type: m.stock === 0 ? 'error' : 'warning',
          read: false,
          createdAt: m.updatedAt || Timestamp.now()
        });
      });

      setNotifications(newNotifications);
    };

    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      updateNotifications();
    }, (error) => {
      console.error('Error fetching products for notifications:', error);
    });

    const unsubMaterials = onSnapshot(qMaterials, (snapshot) => {
      materialsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RawMaterial));
      updateNotifications();
    }, (error) => {
      console.error('Error fetching raw materials for notifications:', error);
    });

    return () => {
      unsubProducts();
      unsubMaterials();
    };
  }, [isAuthenticated]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onTabChange={setActiveTab} />;
      case 'pos':
        return <POSView />;
      case 'inventory':
        return <InventoryView />;
      case 'history':
        return <HistoryView />;
      case 'analysis':
        return <AnalysisView />;
      default:
        return <DashboardView onTabChange={setActiveTab} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      notifications={notifications}
    >
      {renderContent()}
    </Layout>
  );
}
