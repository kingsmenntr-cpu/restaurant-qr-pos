import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    payment: db.payment_settings[0],
    tax: db.tax_settings[0],
    restaurant: db.restaurants[0],
    settings: db.restaurant_settings[0],
  });
}
