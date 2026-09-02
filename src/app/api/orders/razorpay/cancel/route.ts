import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    await dbConnect();

    const body = await request.json();
    const razorpayOrderId = String(body.razorpayOrderId || "").trim();

    if (!razorpayOrderId) {
      return NextResponse.json({ error: "razorpayOrderId is required" }, { status: 400 });
    }

    const pendingPayment = await Payment.findOne({
      gatewayProvider: "razorpay",
      status: "PENDING",
      "gatewayPayload.razorpayOrderId": razorpayOrderId,
    });

    if (!pendingPayment) {
      // Already verified, already cancelled, or never existed — nothing to do
      return NextResponse.json({ success: true });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const payment = await Payment.findById(pendingPayment._id).session(session);
    if (!payment || payment.status !== "PENDING") {
      await session.abortTransaction();
      session.endSession();
      session = null;
      return NextResponse.json({ success: true });
    }

    const order = await Order.findById(payment.orderId).session(session);
    if (!order || order.paymentStatus !== "PENDING") {
      await session.abortTransaction();
      session.endSession();
      session = null;
      return NextResponse.json({ success: true });
    }

    const quantity = order.quantity || 1;

    // Release reserved stock back to available
    await Product.updateOne(
      { _id: order.productId },
      {
        $inc: { availableStock: quantity, reservedStock: -quantity },
        $set: { status: "AVAILABLE" },
      },
      { session }
    );

    order.orderStatus = "CANCELLED";
    order.paymentStatus = "REJECTED";
    await order.save({ session });

    payment.status = "REJECTED";
    payment.rejectionReason = "Customer cancelled payment popup";
    await payment.save({ session });

    await session.commitTransaction();
    session.endSession();
    session = null;

    console.log("Razorpay payment cancelled, stock released:", order.orderNumber);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Razorpay cancel error:", error);
    if (session) {
      try {
        await session.abortTransaction();
      } catch {}
      session.endSession();
    }
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}