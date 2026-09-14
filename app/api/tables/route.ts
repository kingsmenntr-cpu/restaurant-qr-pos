import { NextRequest, NextResponse } from "next/server";
import { TableService } from "@/lib/services/tableService";
import { tableCreateSchema } from "@/lib/schemas";

export async function GET() {
  const tables = await TableService.getAllWithQrAsync();
  return NextResponse.json({ tables });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = tableCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.errors[0].message } }, { status: 400 });
    const result = await TableService.create(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 500 });
  }
}
