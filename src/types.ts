export interface Ingredient {
  rawMaterialId: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku?: string;
  lowStockThreshold: number;
  imageUrl?: string;
  ingredients?: Ingredient[];
  updatedAt: any;
}

export interface RawMaterial {
  id: string;
  name: string;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  updatedAt: any;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  notes?: string;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: any;
  createdBy: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  read: boolean;
  createdAt: any;
}
