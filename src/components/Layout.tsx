import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ShoppingCart, Package, History, Bell, LogOut, User as UserIcon, Menu, X, PieChart, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, logOut, signIn } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { cn } from '../lib/utils';
import { Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: Notification[];
  onDismissNotification?: (id: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab, notifications, onDismissNotification }: LayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Kasir (POS)', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'history', label: 'Riwayat Penjualan', icon: History },
    { id: 'analysis', label: 'Analisis Keuangan', icon: PieChart },
  ];

  const displayUser = user || { displayName: 'Admin Mendua', email: 'admin@mendua.com', photoURL: '' };
  const notificationsCount = notifications.length;

  if (!user) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-terracotta-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-earth-200/50 rounded-full blur-3xl" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="bg-white/80 backdrop-blur-xl p-10 md:p-14 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-white/50 relative z-10"
        >
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-br from-terracotta-400 to-terracotta-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-terracotta-500/20"
          >
            <ShoppingCart className="text-white w-12 h-12" strokeWidth={1.5} />
          </motion.div>
          
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.4 }}
          >
            <h1 className="text-4xl font-extrabold text-terracotta-900 mb-3 tracking-tight">Kedai Mendua</h1>
            <p className="text-terracotta-600/80 mb-10 text-lg font-medium">Sistem Kasir & Inventory Terpadu</p>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.5 }}
          >
            <button
              onClick={signIn}
              className="group relative w-full bg-white hover:bg-terracotta-50 text-terracotta-900 border border-terracotta-200 font-semibold py-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-terracotta-500 text-white flex items-center justify-center gap-3 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 ease-out">
                <UserIcon size={22} />
                <span className="font-semibold">Masuk dengan Google</span>
              </div>
              <div className=" flex items-center justify-center gap-3 w-full group-hover:opacity-0 transition-opacity duration-300">
                <UserIcon size={22} className="text-terracotta-500" />
                <span>Masuk Sekarang</span>
              </div>
            </button>
            <p className="mt-6 text-sm text-terracotta-500/80">Silakan login untuk mengakses sistem</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 flex overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-terracotta-900/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isMobile ? (isSidebarOpen ? 280 : 0) : (isSidebarOpen ? 280 : 80),
          x: isMobile && !isSidebarOpen ? -280 : 0
        }}
        className={cn(
          "bg-white border-r border-terracotta-100 flex flex-col h-screen sticky top-0",
          isMobile ? "fixed z-50 left-0 top-0 shadow-2xl" : "z-40"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-terracotta-500 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-xl text-terracotta-900 truncate">Kedai Mendua</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-terracotta-50 rounded-lg text-terracotta-700 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group text-left",
                activeTab === item.id 
                  ? "bg-terracotta-500 text-white shadow-md shadow-terracotta-500/20" 
                  : "text-terracotta-700 hover:bg-terracotta-50"
              )}
            >
              <item.icon size={22} className={cn("shrink-0", activeTab === item.id ? "text-white" : "text-terracotta-400 group-hover:text-terracotta-600")} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              {item.id === 'dashboard' && notificationsCount > 0 && isSidebarOpen && (
                <span className="ml-auto bg-red-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-white">
                  {notificationsCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-terracotta-100">
          <div className={cn("flex items-center p-2 rounded-xl bg-earth-100/50 mb-3", !isSidebarOpen && "justify-center")}>
            <img 
              src={displayUser.photoURL || `https://ui-avatars.com/api/?name=${displayUser.displayName}&background=e2725b&color=fff`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
            {isSidebarOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-terracotta-900 truncate">{displayUser.displayName}</p>
                <p className="text-xs text-terracotta-500 truncate">{displayUser.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={logOut}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut size={20} className="shrink-0" />
            {isSidebarOpen && <span className="font-medium">Keluar</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-terracotta-100 px-4 md:px-8 py-4 md:py-5 flex items-center justify-between">
           <div className="flex items-center gap-3 md:gap-4">
             {isMobile && !isSidebarOpen && (
               <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg bg-terracotta-50 text-terracotta-600 hover:bg-terracotta-100 transition-colors"
               >
                 <Menu size={22} />
               </button>
             )}
             <h2 className="text-xl md:text-2xl font-bold text-terracotta-900 capitalize">
              {navItems.find(t => t.id === activeTab)?.label}
             </h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2.5 rounded-full bg-white border border-terracotta-100 text-terracotta-600 hover:bg-terracotta-50 transition-all shadow-sm"
                >
                  <Bell size={20} />
                  {notificationsCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-terracotta-100 overflow-hidden z-50 origin-top-right"
                    >
                      <div className="p-4 border-b border-terracotta-50 flex items-center justify-between bg-earth-50/50">
                        <h3 className="font-semibold text-terracotta-900">Notifikasi</h3>
                        {notificationsCount > 0 && (
                          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
                            {notificationsCount} Baru
                          </span>
                        )}
                      </div>
                      
                      <div className="max-h-[70vh] overflow-y-auto">
                        {notificationsCount > 0 ? (
                          <div className="divide-y divide-terracotta-50">
                            {notifications.map((notif) => (
                              <div key={notif.id} className="relative p-4 hover:bg-terracotta-50 transition-colors flex gap-3 group">
                                <div className={cn(
                                  "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                                  notif.type === 'error' ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                                )}>
                                  <AlertTriangle size={20} />
                                </div>
                                <div className="pr-6">
                                  <h4 className="text-sm font-semibold text-terracotta-900">{notif.title}</h4>
                                  <p className="text-sm text-terracotta-600 mt-0.5">{notif.message}</p>
                                </div>
                                {onDismissNotification && (
                                  <button
                                    onClick={() => onDismissNotification(notif.id)}
                                    className="absolute top-4 right-4 text-terracotta-300 hover:text-terracotta-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-terracotta-500">
                            <Bell className="w-12 h-12 mx-auto mb-3 text-terracotta-300 opacity-50" />
                            <p>Tidak ada notifikasi baru</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
