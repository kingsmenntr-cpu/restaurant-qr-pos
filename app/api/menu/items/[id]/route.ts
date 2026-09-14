import { NextRequest, NextResponse } from "next/server";
import { MenuService } from "@/lib/services/menuService";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    MenuService.deleteItem(params.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 500 });
  }
}
