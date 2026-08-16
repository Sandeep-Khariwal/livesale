import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { Product } from "@/models/Product";
import { ShippingAddress } from "@/models/ShippingAddress";

export async function GET() {
  try {
    await dbConnect();

    // Populate customer and product info
    const orders = await Order.find()
      .populate({ path: "customerId", model: Customer })
      .populate({ path: "productId", model: Product })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch all shipping addresses for these orders in one query
    const orderIds = orders.map((o: any) => o._id);
    const addresses = await ShippingAddress.find({ orderId: { $in: orderIds } }).lean();
    const addressMap = new Map(addresses.map((a: any) => [a.orderId.toString(), a]));

    // Re-map for the frontend
    const mappedOrders = orders.map((o: any) => {
      const addr = addressMap.get(o._id.toString());
      return {
        ...o,
        customer: {
          ...o.customerId,
          address: addr?.address,
          city: addr?.city,
          state: addr?.state,
          pincode: addr?.pincode,
        },
        product: o.productId,
      };
    });

    return NextResponse.json({ orders: mappedOrders });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}