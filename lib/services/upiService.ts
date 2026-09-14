import { getDb } from "../db";
import { generateUpiPayload, calculateUpiQrAmount } from "../utils";
import { AppError } from "../types";

export const UPIService = {
  getSettings() {
    const db = getDb();
    return db.payment_settings[0];
  },
  updateSettings(data: { upi_enabled: boolean; upi_id: string; merchant_name: string }) {
    const db = getDb();
    const settings = db.payment_settings[0];
    Object.assign(settings, data);
    return settings;
  },
  generateBillUpiQr(billId: string) {
    const db = getDb();
    const bill = db.bills.find(b=>b.id===billId);
    if (!bill) throw new AppError("NOT_FOUND","Bill not found",404);
    const settings = db.payment_settings[0];
    if (!settings.upi_id || !settings.merchant_name) throw new AppError("UPI_NOT_CONFIGURED","UPI not configured",422);

    const payments = db.payments.filter(p=>p.bill_id===billId);
    const cash = payments.filter(p=>p.method==="CASH").reduce((s,p)=>s+p.amount,0);
    const upi = payments.filter(p=>p.method==="UPI").reduce((s,p)=>s+p.amount,0);
    // If no payments yet, QR = full amount (BR-018)
    let qrAmount: number;
    if (payments.length===0) {
      qrAmount = bill.grand_total;
    } else {
      qrAmount = calculateUpiQrAmount({ cash, upi }, bill.grand_total);
    }

    const upiPayload = generateUpiPayload(settings.upi_id, settings.merchant_name, qrAmount, `Bill ${bill.bill_number}`);
    return { qrAmount, upiPayload, settings, bill };
  }
};
