import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";

export const runtime = "nodejs";

/*
 * RESERVATION EXPIRY CRON
 * ------------------------
 * Har kuch minutes mein chalta hai. Jo Orders "PENDING_PAYMENT_VERIFICATION"
 * mein reh gaye hain aur unka reservationExpiresAt beet chuka hai
 * (customer ne payment start karke chhod diya), unka reserved stock
 * wapas availableStock mein daal deta hai — taaki wo product dusre
 * customer ko bik sake.
 *
 * SETUP (Vercel):
 * vercel.json mein:
 * {
 *   "crons": [
 *     { "path": "/api/cron/release-expired-reservations", "schedule": "*\/5 * * * *" }
 *   ]
 * }
 * (har 5 minute mein chalega)
 *
 * SECURITY: CRON_SECRET env var set karo, Vercel Cron automatically
 * "Authorization: Bearer <CRON_SECRET>" header bhejta hai. Iske bina
 * koi bhi is endpoint ko publicly hit kar sakta hai.
 */

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.warn(
        "[cron] CRON_SECRET not set — endpoint is unauthenticated."
      );
    }

    await dbConnect();

    const now = new Date();

    // Expired reservations dhoondo
    const expiredOrders = await Order.find({
      orderStatus: "PENDING_PAYMENT_VERIFICATION",
      paymentStatus: "PENDING",
      reservationExpiresAt: { $lt: now },
    }).limit(200); // ek run mein max 200, taaki cron timeout na ho

    let releasedCount = 0;
    let errorCount = 0;

    for (const order of expiredOrders) {
      try {
        // Double-check: payment kahin VERIFIED toh nahi ho gaya beech
        // mein (race condition webhook/verify ke saath).
        const payment = await Payment.findOne({ orderId: order._id });

        if (payment?.status === "VERIFIED") {
          // Payment aa chuka hai, ye order expire nahi karna — sirf
          // isko VERIFIED/CONFIRMED sync kar do agar order khud stale hai.
          if (order.orderStatus !== "CONFIRMED") {
            order.paymentStatus = "VERIFIED";
            order.orderStatus = "CONFIRMED";
            await order.save();
          }
          continue;
        }

        // Stock release: reservedStock -quantity, availableStock +quantity
        const stockUpdate = await Product.updateOne(
          { _id: order.productId, reservedStock: { $gte: order.quantity } },
          {
            $inc: { availableStock: order.quantity, reservedStock: -order.quantity },
            $set: { status: "AVAILABLE" },
          }
        );

        if (stockUpdate.modifiedCount === 0) {
          console.error(
            `[cron] Could not release stock for order ${order.orderNumber} — reservedStock already 0`
          );
        }

        order.orderStatus = "EXPIRED";
        order.paymentStatus = "REJECTED";
        await order.save();

        if (payment && payment.status === "PENDING") {
          payment.status = "REJECTED";
          payment.rejectionReason = "Reservation expired — payment not completed in time";
          await payment.save();
        }

        releasedCount++;
      } catch (err) {
        errorCount++;
        console.error(
          `[cron] Failed to release order ${order.orderNumber}:`,
          err
        );
      }
    }

    console.log(
      `[cron] Reservation expiry run complete. Released: ${releasedCount}, Errors: ${errorCount}, Total checked: ${expiredOrders.length}`
    );

    return NextResponse.json({
      success: true,
      checked: expiredOrders.length,
      released: releasedCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("[cron] Reservation expiry job failed:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}