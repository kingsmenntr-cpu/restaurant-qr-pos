import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/lib/services/orderService";
import { orderStatusSchema } from "@/lib/schemas";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = orderStatusSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.errors[0].message } }, { status: 400 });
    const result = OrderService.updateStatus(params.id, parsed.data.status as any);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status || 500 });
  }
}
