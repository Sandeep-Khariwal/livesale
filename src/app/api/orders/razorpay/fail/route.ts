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
    const reason = String(body.reason || "Payment declined by bank/gateway").trim();

    if (!razorpayOrderId) {
      return NextResponse.json({ error: "razorpayOrderId is required" }, { status: 400 });
    }

    const pendingPayment = await Payment.findOne({
      gatewayProvider: "razorpay",
      status: "PENDING",
      "gatewayPayload.razorpayOrderId": razorpayOrderId,
    });

    if (!pendingPayment) {
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

    await Product.updateOne(
      { _id: order.productId },
      {
        $inc: { availableStock: quantity, reservedStock: -quantity },
        $set: { status: "AVAILABLE" },
      },
      { session }
    );

    // REJECTED — this is a real decline from the bank/gateway
    order.orderStatus = "CANCELLED";
    order.paymentStatus = "REJECTED";
    await order.save({ session });

    payment.status = "REJECTED";
    payment.rejectionReason = reason;
    await payment.save({ session });

    await session.commitTransaction();
    session.endSession();
    session = null;

    console.log("Razorpay payment actually failed, stock released:", order.orderNumber);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Razorpay fail-handler error:", error);
    if (session) {
      try {
        await session.abortTransaction();
      } catch {}
      session.endSession();
    }
    return NextResponse.json({ error: "Failed to mark payment failed" }, { status: 500 });
  }
}