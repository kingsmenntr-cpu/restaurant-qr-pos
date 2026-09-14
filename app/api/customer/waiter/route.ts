import { NextRequest, NextResponse } from "next/server";
import { WaiterService } from "@/lib/services/waiterService";
import { waiterRequestSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = waiterRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.errors[0].message } }, { status: 400 });
    const result = await WaiterService.createRequest(parsed.data.token);
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status || 500 });
  }
}
