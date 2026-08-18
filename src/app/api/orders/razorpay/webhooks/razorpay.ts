import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";

import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { StockTransaction } from "@/models/StockTransaction";

export const runtime = "nodejs";

/*
 * RAZORPAY WEBHOOK
 * -----------------
 * Ye endpoint frontend se independent hai — Razorpay seedha server ko
 * batata hai payment successful hua ya nahi. Ye zaroori hai kyunki
 * frontend "handler" callback kabhi miss ho sakta hai (browser band,
 * network drop, tab crash) — us case mein customer ka paisa kat jaata
 * hai lekin /verify kabhi call nahi hota. Webhook uska safety net hai.
 *
 * SETUP (Razorpay Dashboard):
 * 1. Settings -> Webhooks -> Add New Webhook
 * 2. URL: https://yourdomain.com/api/orders/razorpay/webhook
 * 3. Active events: payment.captured (aur chaho toh payment.failed bhi)
 * 4. Ek "Webhook Secret" set karo — ye RAZORPAY_KEY_SECRET se ALAG hota
 *    hai. Isko .env mein RAZORPAY_WEBHOOK_SECRET naam se daalo.
 *
 * Idempotent hai — agar frontend handler pehle hi verify kar chuka hai,
 * ya webhook do baar aa jaaye (Razorpay retry karta hai), dono cases
 * safely handle hote hain.
 */

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is missing");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Raw body chahiye signature verify karne ke liye — JSON parse karne
    // se pehle text ke roop mein lena zaroori hai.
    const rawBody = await request.text();

    const receivedSignature = request.headers.get("x-razorpay-signature");

    if (!receivedSignature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 400 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const signaturesMatch =
      expectedSignature.length === receivedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf8"),
        Buffer.from(receivedSignature, "utf8")
      );

    if (!signaturesMatch) {
      console.error("Razorpay webhook signature mismatch");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);

    // Sirf payment.captured event process karo abhi.
    if (event.event !== "payment.captured") {
      // Dusre events (payment.failed, order.paid, etc.) ko ignore karo
      // lekin 200 return karo taaki Razorpay retry na kare.
      return NextResponse.json({ received: true, ignored: event.event });
    }

    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity) {
      console.error("Webhook payload missing payment entity");
      return NextResponse.json(
        { error: "Malformed payload" },
        { status: 400 }
      );
    }

    const razorpayOrderId = paymentEntity.order_id as string;
    const razorpayPaymentId = paymentEntity.id as string;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json(
        { error: "Missing order_id/payment_id in payload" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Idempotency: agar ye payment id already VERIFIED hai (frontend
    // handler ya pehle wala webhook retry ne already confirm kar diya),
    // toh kuch mat karo.
    const alreadyVerified = await Payment.findOne({
      gatewayProvider: "razorpay",
      gatewayTransactionId: razorpayPaymentId,
      status: "VERIFIED",
    });

    if (alreadyVerified) {
      return NextResponse.json({ received: true, alreadyVerified: true });
    }

    const pendingPayment = await Payment.findOne({
      gatewayProvider: "razorpay",
      status: "PENDING",
      "gatewayPayload.razorpayOrderId": razorpayOrderId,
    });

    if (!pendingPayment) {
      // Ho sakta hai Order/Payment record hi na bane ho (create step fail
      // hua ho) ya already kisi aur reason se resolve ho chuka ho.
      console.error(
        "Webhook: pending payment not found for razorpayOrderId:",
        razorpayOrderId
      );
      return NextResponse.json(
        { error: "Pending payment not found" },
        { status: 404 }
      );
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const payment = await Payment.findById(pendingPayment._id).session(session);

    if (!payment) {
      throw new Error("Payment record disappeared.");
    }

    if (payment.status === "VERIFIED") {
      // Race condition: frontend handler ne beech mein verify kar diya.
      await session.commitTransaction();
      session.endSession();
      session = null;
      return NextResponse.json({ received: true, alreadyVerified: true });
    }

    const order = await Order.findById(payment.orderId).session(session);

    if (!order) {
      throw new Error(`Order not found for payment ${payment._id}`);
    }

    if (order.orderStatus === "CANCELLED" || order.orderStatus === "EXPIRED") {
      // Reservation expire ho chuki thi cron ke through, lekin payment
      // phir bhi capture ho gaya (edge case — customer ne deri se pay
      // kiya). Stock wapas nahi le sakte kyunki paisa aa chuka hai —
      // manual review ke liye flag karo.
      console.error(
        `CRITICAL: Payment captured for an expired/cancelled order: ${order.orderNumber}. Manual review needed.`
      );
      payment.status = "VERIFIED";
      payment.verifiedAt = new Date();
      payment.gatewayTransactionId = razorpayPaymentId;
      payment.gatewayPayload = {
        ...(payment.gatewayPayload || {}),
        razorpay_payment_id: razorpayPaymentId,
        webhookNote: "Captured after expiry — needs manual review",
      };
      await payment.save({ session });

      order.paymentStatus = "VERIFIED";
      // orderStatus jaan-boojhkar CANCELLED/EXPIRED hi rehne dete hain,
      // admin ko manually resolve karna hoga (stock available ho sakta
      // hai ya kisi aur ko sell ho chuka ho).
      await order.save({ session });

      await session.commitTransaction();
      session.endSession();
      session = null;

      return NextResponse.json({
        received: true,
        warning: "Order was expired/cancelled — flagged for manual review",
      });
    }

    const product = await Product.findById(order.productId).session(session);

    if (!product) {
      throw new Error(`Product not found for order ${order.orderNumber}`);
    }

    const stockResult = await Product.updateOne(
      { _id: product._id, reservedStock: { $gte: 1 } },
      { $inc: { reservedStock: -1 } },
      { session }
    );

    if (stockResult.modifiedCount === 0) {
      throw new Error(
        `Reserved stock not found for order ${order.orderNumber}`
      );
    }

    order.paymentStatus = "VERIFIED";
    order.orderStatus = "CONFIRMED";
    await order.save({ session });

    payment.status = "VERIFIED";
    payment.verifiedAt = new Date();
    payment.gatewayTransactionId = razorpayPaymentId;
    payment.gatewayPayload = {
      ...(payment.gatewayPayload || {}),
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      confirmedVia: "webhook",
    };
    await payment.save({ session });

    const stockTx = new StockTransaction({
      productId: product._id,
      type: "SALE",
      quantity: -1,
      orderId: order._id,
      reason: "Online payment via Razorpay — confirmed via webhook",
    });
    await stockTx.save({ session });

    await session.commitTransaction();
    session.endSession();
    session = null;

    console.log(
      "Razorpay webhook: order verified successfully:",
      order.orderNumber
    );

    return NextResponse.json({ received: true, orderNumber: order.orderNumber });
  } catch (error: any) {
    console.error("Razorpay webhook error:", error);

    if (session) {
      try {
        await session.abortTransaction();
      } catch {}
      session.endSession();
    }

    // 500 return karo taaki Razorpay is event ko retry kare.
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}