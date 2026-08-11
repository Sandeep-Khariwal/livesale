import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";

export async function GET() {
  try {
    await dbConnect();

    const totalProducts = await Product.countDocuments();
    const availableProducts = await Product.countDocuments({ status: "AVAILABLE" });
    const soldOutProducts = await Product.countDocuments({ status: "SOLD_OUT" });

    const totalOrders = await Order.countDocuments();
    const pendingPayments = await Order.countDocuments({ paymentStatus: "PENDING" });
    const confirmedOrders = await Order.countDocuments({ paymentStatus: "VERIFIED" });

    const verifiedOrders = await Order.find({ paymentStatus: "VERIFIED" });
    const totalSales = verifiedOrders.reduce((sum, order) => sum + (order.amount || 0), 0);

    return NextResponse.json({
      totalProducts,
      availableProducts,
      soldOutProducts,
      totalOrders,
      pendingPayments,
      confirmedOrders,
      totalSales,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
