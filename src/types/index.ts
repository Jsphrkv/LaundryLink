export type UserRole = 'customer' | 'rider' | 'shop_owner' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

export interface RiderProfile {
  id: string;
  user_id: string;
  vehicle_type: 'motorcycle' | 'bicycle' | 'tricycle';
  vehicle_plate: string;
  license_number: string;
  bank_account?: string;
  gcash_number?: string;
  status: 'online' | 'offline' | 'on_delivery';
  current_lat?: number;
  current_lng?: number;
  rating: number;
  total_deliveries: number;
  is_kyc_verified: boolean;
  user?: Pick<User, 'full_name' | 'phone' | 'avatar_url'>;
}

export interface ShopService {
  id: string;
  shop_id: string;
  service_type: ServiceType;
  price_per_kg: number;
  minimum_kg: number;
  estimated_hours: number;
  is_available: boolean;
}

export interface ShopProfile {
  id: string;
  user_id: string;
  shop_name: string;
  description?: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  logo_url?: string;
  operating_hours?: Record<string, { is_open: boolean; open: string; close: string }>;
  services: ShopService[];
  rating: number;
  total_reviews: number;
  is_open: boolean;
  is_verified: boolean;
  distance_km?: number;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_address: string;
  barangay: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  is_default: boolean;
}

export type ServiceType = 'wash_fold' | 'wash_dry' | 'express' | 'dry_clean' | 'ironing';
export type ShopFilter  = 'nearest' | 'cheapest' | 'fastest';

export type OrderStatus =
  | 'pending' | 'confirmed' | 'rider_assigned'
  | 'rider_on_way_pickup' | 'picked_up' | 'washing'
  | 'ready_for_delivery' | 'rider_on_way_delivery'
  | 'delivered' | 'cancelled' | 'refunded';

export type PaymentMethod = 'cash_on_delivery' | 'gcash' | 'paymaya';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  shop_id: string;
  rider_id?: string;
  pickup_address_id: string;
  service_type: ServiceType;
  scheduled_pickup_date: string;
  scheduled_pickup_time: string;
  estimated_weight_kg: number;
  actual_weight_kg?: number;
  special_instructions?: string;
  bag_count: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  estimated_completion?: string;
  created_at: string;
  updated_at: string;
  // joined
  customer?: Partial<User>;
  shop?: Partial<ShopProfile>;
  rider?: Partial<RiderProfile>;
  pickup_address?: Partial<Address>;
  status_history?: OrderStatusHistory[];
  rating?: OrderRating;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  note?: string;
  created_at: string;
  created_by: string;
}

export interface OrderRating {
  id: string;
  order_id: string;
  customer_id: string;
  shop_rating: number;
  rider_rating?: number;
  shop_comment?: string;
  rider_comment?: string;
  created_at: string;
}

export interface BookingState {
  step: number;
  pickup_address?: Address;
  scheduled_date?: string;
  scheduled_time?: string;
  bag_count: number;
  estimated_weight_kg: number;
  special_instructions?: string;
  service_type?: ServiceType;
  shop_filter: ShopFilter;
  selected_shop?: ShopProfile;
  payment_method?: PaymentMethod;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'order_update' | 'promo' | 'system';
  order_id?: string;
  is_read: boolean;
  created_at: string;
}
