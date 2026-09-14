import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billingService";
import { UPIService } from "@/lib/services/upiService";
import { paymentSchema } from "@/lib/schemas";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.errors[0].message } }, { status: 400 });
    const result = BillingService.addPayment(params.id, parsed.data);
    const upiQr = UPIService.generateBillUpiQr(params.id);
    return NextResponse.json({ ...result, ...upiQr });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: e.status || 500 });
  }
}
