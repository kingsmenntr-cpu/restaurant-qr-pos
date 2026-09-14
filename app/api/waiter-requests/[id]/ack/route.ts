import { NextRequest, NextResponse } from "next/server";
import { WaiterService } from "@/lib/services/waiterService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const r = await WaiterService.acknowledge(params.id);
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: e.status||500 });
  }
}
