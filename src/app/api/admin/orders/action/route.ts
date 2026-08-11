import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { StockTransaction } from "@/models/StockTransaction";
import { OrderStatusHistory } from "@/models/OrderStatusHistory";

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;
  
  try {
    const { orderId, action } = await request.json();
    
    if (!orderId || !["VERIFY", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    await dbConnect();
    session = await mongoose.startSession();
    session.startTransaction();

    const order = await Order.findById(orderId).session(session);
    if (!order || order.paymentStatus !== "PENDING") {
      await session.abortTransaction();
      return NextResponse.json({ error: "Order not found or already processed" }, { status: 400 });
    }

    if (action === "VERIFY") {
      // 1. Update Order Status
      order.paymentStatus = "VERIFIED";
      order.orderStatus = "CONFIRMED";
      await order.save({ session });

      // 2. Update Payment Record
      await Payment.updateOne({ orderId: order._id }, { status: "VERIFIED" }, { session });

      // 3. Complete Stock Allocation
      await Product.updateOne(
        { _id: order.productId },
        { $inc: { reservedStock: -1, soldStock: 1 } },
        { session }
      );

      // 4. Audit Trail
      const history = new OrderStatusHistory({
        orderId: order._id,
        status: "CONFIRMED",
        note: "Payment verified by admin",
      });
      await history.save({ session });

    } else if (action === "REJECT") {
      // 1. Cancel Order
      order.paymentStatus = "REJECTED";
      order.orderStatus = "CANCELLED";
      await order.save({ session });

      // 2. Update Payment Record
      await Payment.updateOne({ orderId: order._id }, { status: "REJECTED" }, { session });

      // 3. Release Reserved Stock (Optimistic release)
      const product = await Product.findById(order.productId).session(session);
      if (product) {
        product.reservedStock = Math.max(0, product.reservedStock - 1);
        product.availableStock += 1;
        product.status = "AVAILABLE"; // Product comes back online
        await product.save({ session });

        // Reverse stock transaction
        const stockTx = new StockTransaction({
          productId: product._id,
          type: "RESERVATION_RELEASE",
          quantity: 1,
          orderId: order._id,
          reason: "Payment Rejected - Order Cancelled",
        });
        await stockTx.save({ session });
      }

      const history = new OrderStatusHistory({
        orderId: order._id,
        status: "CANCELLED",
        note: "Payment rejected by admin. Stock released.",
      });
      await history.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error("Order action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
