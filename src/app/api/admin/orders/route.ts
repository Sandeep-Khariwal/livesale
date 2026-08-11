import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { Product } from "@/models/Product";
import { Payment } from "@/models/Payment";

export async function GET() {
  try {
    await dbConnect();

    // Populate customer and product info
    const orders = await Order.find()
      .populate({ path: "customerId", model: Customer })
      .populate({ path: "productId", model: Product })
      .sort({ createdAt: -1 })
      .lean();

    // Re-map for the frontend
    const mappedOrders = orders.map((o: any) => ({
      ...o,
      customer: o.customerId,
      product: o.productId,
    }));

    return NextResponse.json({ orders: mappedOrders });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
