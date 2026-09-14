import { NextRequest, NextResponse } from "next/server";
import { MenuService } from "@/lib/services/menuService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = MenuService.toggleAvailability(params.id);
    return NextResponse.json(item);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 500 });
  }
}
