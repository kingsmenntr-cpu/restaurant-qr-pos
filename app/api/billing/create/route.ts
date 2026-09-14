import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billingService";
import { billCreateSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = billCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.errors[0].message } }, { status: 400 });
    const bill = BillingService.createBill(parsed.data.table_session_id);
    return NextResponse.json({ bill }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: e.status || 500 });
  }
}
