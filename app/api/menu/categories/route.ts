import { NextRequest, NextResponse } from "next/server";
import { MenuService } from "@/lib/services/menuService";
import { categorySchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.errors[0].message } }, { status: 400 });
    const cat = MenuService.createCategory(parsed.data.name, parsed.data.sort_order);
    return NextResponse.json(cat, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 500 });
  }
}
