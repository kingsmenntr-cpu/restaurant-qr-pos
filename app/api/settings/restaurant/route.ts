import { NextRequest, NextResponse } from "next/server";
import { SettingsService } from "@/lib/services/settingsService";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = SettingsService.updateRestaurant(body);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 500 });
  }
}
