import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { StockTransaction } from "@/models/StockTransaction";
import { OrderStatusHistory } from "@/models/OrderStatusHistory";

async function runOrderAction(orderId: string, action: "VERIFY" | "REJECT") {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Atomic update: only proceeds if order is still PENDING (also guards against double-processing)
    const newPaymentStatus = action === "VERIFY" ? "VERIFIED" : "REJECTED";
    const newOrderStatus = action === "VERIFY" ? "CONFIRMED" : "CANCELLED";

    const order = await Order.findOneAndUpdate(
      { _id: orderId, paymentStatus: "PENDING" },
      { $set: { paymentStatus: newPaymentStatus, orderStatus: newOrderStatus } },
      { session, new: true } // runValidators intentionally omitted — avoids re-validating legacy/untouched fields
    );

    if (!order) {
      await session.abortTransaction();
      return { status: 400, body: { error: "Order not found or already processed" } };
    }

    await Payment.updateOne({ orderId: order._id }, { status: newPaymentStatus }, { session });

    if (action === "VERIFY") {
      await Product.updateOne(
        { _id: order.productId },
        { $inc: { reservedStock: -1 } },
        { session }
      );

      const history = new OrderStatusHistory({
        orderId: order._id,
        toStatus: "CONFIRMED",
        note: "Payment verified by admin",
      });
      await history.save({ session });
    } else if (action === "REJECT") {
      const product = await Product.findById(order.productId).session(session);
      if (product) {
        product.reservedStock = Math.max(0, product.reservedStock - 1);
        product.availableStock += 1;
        product.status = "AVAILABLE";
        await product.save({ session });

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
        toStatus: "CANCELLED",
        note: "Payment rejected by admin. Stock released.",
      });
      await history.save({ session });
    }

    await session.commitTransaction();
    return { status: 200, body: { success: true } };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, action } = await request.json();

    if (!orderId || !["VERIFY", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    await dbConnect();

    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await runOrderAction(orderId, action);
        return NextResponse.json(result.body, { status: result.status });
      } catch (error: any) {
        lastError = error;
        const isTransient = error?.errorLabelSet?.has?.("TransientTransactionError") || error?.hasErrorLabel?.("TransientTransactionError");
        if (!isTransient) break;
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
      }
    }

    console.error("Order action error:", lastError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } catch (error) {
    console.error("Order action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}