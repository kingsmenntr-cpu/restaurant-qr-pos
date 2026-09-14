import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/lib/services/orderService";
import { orderCreateSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = orderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.errors[0].message } }, { status: 400 });
    }
    const result = await OrderService.createOrder(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    const status = e.status || 500;
    return NextResponse.json({ error: { code: e.code || "INTERNAL", message: e.message } }, { status });
  }
}
