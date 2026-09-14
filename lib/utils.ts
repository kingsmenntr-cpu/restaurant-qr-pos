export function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

// Money helpers - never use float for finance, use integer paise
export function toPaise(amount: number): number {
  return Math.round(amount * 100);
}
export function fromPaise(paise: number): number {
  return paise / 100;
}
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}
export function safeAdd(...amounts: number[]): number {
  const totalPaise = amounts.reduce((sum, a) => sum + toPaise(a), 0);
  return fromPaise(totalPaise);
}
export function safeSub(a: number, b: number): number {
  return fromPaise(toPaise(a) - toPaise(b));
}
export function safeMul(amount: number, qty: number): number {
  return fromPaise(toPaise(amount) * qty);
}

// UPI QR Amount Logic (BR-018,019,020)
export function calculateUpiQrAmount(payment: { cash: number; upi: number }, grandTotal: number): number {
  const hasCash = payment.cash > 0;
  const hasUpi = payment.upi > 0;
  if (hasCash && hasUpi) {
    return payment.upi;
  }
  return grandTotal;
}

export function generateUpiPayload(upiId: string, merchantName: string, amount: number, txnNote = "Restaurant Bill"): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: merchantName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: txnNote,
  });
  return `upi://pay?${params.toString()}`;
}

export function generateSecureToken(): string {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID().replace(/-/g, "") + (crypto as any).randomUUID().replace(/-/g, "").slice(0, 16);
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16) + token.slice(0, 8);
}

export function generateOrderNumber(): string {
  return `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random()*900)}`;
}
export function generateBillNumber(): string {
  return `BILL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random()*900)}`;
}
