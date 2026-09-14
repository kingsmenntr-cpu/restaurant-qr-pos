import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billingService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bill = BillingService.completeBill(params.id);
    return NextResponse.json({ bill });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: e.status || 500 });
  }
}
