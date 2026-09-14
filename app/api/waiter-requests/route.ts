import { NextResponse } from "next/server";
import { WaiterService } from "@/lib/services/waiterService";

export async function GET() {
  const requests = await WaiterService.getAllAsync();
  return NextResponse.json({ requests });
}
