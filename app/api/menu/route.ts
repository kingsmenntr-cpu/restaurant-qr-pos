import { NextResponse } from "next/server";
import { MenuService } from "@/lib/services/menuService";

export async function GET() {
  const categories = MenuService.getCategories();
  const items = MenuService.getMenuItems();
  return NextResponse.json({ categories, items });
}
