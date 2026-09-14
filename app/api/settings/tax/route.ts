import { NextRequest, NextResponse } from "next/server";
import { SettingsService } from "@/lib/services/settingsService";
import { taxSettingsSchema } from "@/lib/schemas";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = taxSettingsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.errors[0].message } }, { status: 400 });
    const updated = SettingsService.updateTax(parsed.data);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 500 });
  }
}
