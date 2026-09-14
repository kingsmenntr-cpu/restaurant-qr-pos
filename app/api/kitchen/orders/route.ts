import { NextResponse } from "next/server";
import { OrderService } from "@/lib/services/orderService";

export async function GET() {
  const orders = OrderService.getKitchenOrders();
  return NextResponse.json({ orders });
}
