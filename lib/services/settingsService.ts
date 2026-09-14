import { getDb } from "../db";

export const SettingsService = {
  getTax() {
    const db = getDb();
    return db.tax_settings[0];
  },
  updateTax(data: { enabled: boolean; cgst_rate: number; sgst_rate: number; igst_rate: number }) {
    const db = getDb();
    Object.assign(db.tax_settings[0], data);
    return db.tax_settings[0];
  },
  getRestaurant() {
    const db = getDb();
    return db.restaurants[0];
  },
  updateRestaurant(data: Partial<{ name: string; address: string; phone: string }>) {
    const db = getDb();
    Object.assign(db.restaurants[0], data);
    return db.restaurants[0];
  }
};
