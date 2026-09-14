import { NextRequest, NextResponse } from "next/server";
import { TableService } from "@/lib/services/tableService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const qr = await TableService.regenerateQr(params.id);
    return NextResponse.json({ qr });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: e.status || 500 });
  }
}
