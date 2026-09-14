export type Role = "OWNER" | "CASHIER" | "KITCHEN";
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "BILL_PENDING" | "DISABLED";
export type SessionStatus = "ACTIVE" | "BILL_PENDING" | "COMPLETED" | "CANCELLED";
export type OrderStatus = "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "SERVED";
export type WaiterStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type BillStatus = "DRAFT" | "PENDING" | "PAID" | "COMPLETED";
export type PaymentMethod = "CASH" | "UPI";
export type VegType = "VEG" | "NON_VEG" | "EGG" | "VEGAN";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  created_at: string;
}
export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  code: string;
  is_active: boolean;
}
export interface User {
  id: string;
  restaurant_id: string;
  branch_id: string;
  role: Role;
  name: string;
  email: string;
  is_active: boolean;
}
export interface RestaurantSettings {
  restaurant_id: string;
  timezone: string;
  currency: string;
}
export interface PaymentSettings {
  restaurant_id: string;
  upi_enabled: boolean;
  upi_id: string;
  merchant_name: string;
}
export interface TaxSettings {
  restaurant_id: string;
  enabled: boolean;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
}
export interface Table {
  id: string;
  restaurant_id: string;
  branch_id: string;
  name: string;
  capacity: number;
  section?: string;
  status: TableStatus;
  is_active: boolean;
  current_session_id?: string | null;
  created_at: string;
}
export interface QrToken {
  id: string;
  table_id: string;
  token: string; // plain for demo, hash in prod
  token_hash: string;
  version: number;
  is_active: boolean;
  created_at: string;
  revoked_at?: string | null;
}
export interface TableSession {
  id: string;
  restaurant_id: string;
  branch_id: string;
  table_id: string;
  status: SessionStatus;
  opened_at: string;
  closed_at?: string | null;
}
export interface Category {
  id: string;
  restaurant_id: string;
  branch_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}
export interface MenuItem {
  id: string;
  restaurant_id: string;
  branch_id: string;
  category_id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  veg_type: VegType;
  available: boolean;
  recommended?: boolean;
  bestseller?: boolean;
  preparation_time?: number;
}
export interface Order {
  id: string;
  restaurant_id: string;
  branch_id: string;
  table_id: string;
  table_session_id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  client_request_id: string;
  created_at: string;
}
export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
  notes?: string;
}
export interface WaiterRequest {
  id: string;
  restaurant_id: string;
  branch_id: string;
  table_id: string;
  table_session_id: string;
  status: WaiterStatus;
  requested_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
}
export interface Bill {
  id: string;
  restaurant_id: string;
  branch_id: string;
  table_id: string;
  table_session_id: string;
  bill_number: string;
  subtotal: number;
  tax_amount: number;
  grand_total: number;
  status: BillStatus;
  created_at: string;
  completed_at?: string | null;
}
export interface BillOrder {
  bill_id: string;
  order_id: string;
}
export interface Payment {
  id: string;
  bill_id: string;
  method: PaymentMethod;
  amount: number;
  status: "COMPLETED" | "PENDING";
  created_at: string;
}
export interface Notification {
  id: string;
  restaurant_id: string;
  branch_id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  table_id?: string;
  recipient_role: Role | "ALL";
  status: "UNREAD" | "READ" | "RESOLVED";
  created_at: string;
}

// Domain Errors
export class AppError extends Error {
  code: string;
  status: number;
  details?: any;
  constructor(code: string, message: string, status = 400, details?: any) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
