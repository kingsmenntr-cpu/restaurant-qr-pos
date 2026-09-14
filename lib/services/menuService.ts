import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { AppError } from "../types";

export const MenuService = {
  getCategories() {
    const db = getDb();
    return db.categories.filter(c => c.is_active).sort((a,b)=>a.sort_order-b.sort_order);
  },
  createCategory(name: string, sort_order = 0) {
    const db = getDb();
    const cat = {
      id: uuidv4(),
      restaurant_id: db.restaurants[0].id,
      branch_id: db.branches[0].id,
      name,
      sort_order,
      is_active: true,
    };
    db.categories.push(cat);
    return cat;
  },
  updateCategory(id: string, data: Partial<{ name: string; sort_order: number; is_active: boolean }>) {
    const db = getDb();
    const cat = db.categories.find(c=>c.id===id);
    if (!cat) throw new AppError("NOT_FOUND","Category not found",404);
    Object.assign(cat, data);
    return cat;
  },
  deleteCategory(id: string) {
    const db = getDb();
    const idx = db.categories.findIndex(c=>c.id===id);
    if (idx===-1) throw new AppError("NOT_FOUND","Category not found",404);
    // check if items exist
    const hasItems = db.menu_items.some(m=>m.category_id===id);
    if (hasItems) throw new AppError("CONFLICT","Cannot delete category with items",409);
    db.categories.splice(idx,1);
  },
  getMenuItems() {
    const db = getDb();
    return db.menu_items;
  },
  getAvailableItems() {
    const db = getDb();
    return db.menu_items.filter(m=>m.available);
  },
  getByCategory(categoryId: string) {
    const db = getDb();
    return db.menu_items.filter(m=>m.category_id===categoryId);
  },
  createItem(data: any) {
    const db = getDb();
    const item = {
      id: uuidv4(),
      restaurant_id: db.restaurants[0].id,
      branch_id: db.branches[0].id,
      category_id: data.category_id,
      name: data.name,
      description: data.description,
      image_url: data.image_url || `https://source.unsplash.com/400x300/?${encodeURIComponent(data.name)},food`,
      price: data.price,
      veg_type: data.veg_type || "VEG",
      available: data.available ?? true,
      recommended: data.recommended ?? false,
      bestseller: data.bestseller ?? false,
    };
    db.menu_items.push(item as any);
    return item;
  },
  updateItem(id: string, data: any) {
    const db = getDb();
    const item = db.menu_items.find(m=>m.id===id);
    if (!item) throw new AppError("NOT_FOUND","Item not found",404);
    Object.assign(item, data);
    return item;
  },
  deleteItem(id: string) {
    const db = getDb();
    const idx = db.menu_items.findIndex(m=>m.id===id);
    if (idx===-1) throw new AppError("NOT_FOUND","Item not found",404);
    db.menu_items.splice(idx,1);
  },
  toggleAvailability(id: string) {
    const db = getDb();
    const item = db.menu_items.find(m=>m.id===id);
    if (!item) throw new AppError("NOT_FOUND","Item not found",404);
    item.available = !item.available;
    return item;
  }
};
