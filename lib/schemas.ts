import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

export const tableCreateSchema = z.object({
  name: z.string().min(1).max(50),
  capacity: z.number().int().min(1).max(20),
  section: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const menuItemSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  veg_type: z.enum(["VEG", "NON_VEG", "EGG", "VEGAN"]).default("VEG"),
  available: z.boolean().default(true),
  recommended: z.boolean().default(false),
  bestseller: z.boolean().default(false),
  image_url: z.string().url().optional().or(z.literal("")),
});

export const orderItemInputSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  notes: z.string().max(200).optional(),
});

export const orderCreateSchema = z.object({
  token: z.string().min(10),
  items: z.array(orderItemInputSchema).min(1),
  notes: z.string().max(500).optional(),
  client_request_id: z.string().min(5),
});

export const waiterRequestSchema = z.object({
  token: z.string().min(10),
});

export const billCreateSchema = z.object({
  table_session_id: z.string().uuid(),
});

export const paymentSchema = z.object({
  cash: z.number().min(0).default(0),
  upi: z.number().min(0).default(0),
});

export const settingsPaymentSchema = z.object({
  upi_enabled: z.boolean(),
  upi_id: z.string().min(3),
  merchant_name: z.string().min(1),
});

export const taxSettingsSchema = z.object({
  enabled: z.boolean(),
  cgst_rate: z.number().min(0).max(50),
  sgst_rate: z.number().min(0).max(50),
  igst_rate: z.number().min(0).max(50),
});

export const orderStatusSchema = z.object({
  status: z.enum(["NEW", "CONFIRMED", "PREPARING", "READY", "SERVED"]),
});
