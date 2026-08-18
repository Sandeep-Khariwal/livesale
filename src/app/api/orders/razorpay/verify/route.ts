// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";
// import crypto from "crypto";
// import dbConnect from "@/lib/mongoose";
// import { Product } from "@/models/Product";
// import { Customer } from "@/models/Customer";
// import { Order } from "@/models/Order";
// import { ShippingAddress } from "@/models/ShippingAddress";
// import { Payment } from "@/models/Payment";
// import { StockTransaction } from "@/models/StockTransaction";
// import { uploadToS3 } from "@/lib/s3";

// export async function POST(request: NextRequest) {
//   let session: mongoose.ClientSession | null = null;
//   try {
//     await dbConnect();

//     const formData = await request.formData();
//     const razorpay_order_id = formData.get("razorpay_order_id") as string;
//     const razorpay_payment_id = formData.get("razorpay_payment_id") as string;
//     const razorpay_signature = formData.get("razorpay_signature") as string;
//     const productCode = formData.get("productCode") as string;
//     const customerDetailsStr = formData.get("customerDetails") as string;
//     const referencePhoto = formData.get("referencePhoto") as File | null;

//     if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !productCode || !customerDetailsStr) {
//       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
//     }

//     // Verify Razorpay signature (proves payment is genuine, not spoofed)
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest("hex");

//     if (expectedSignature !== razorpay_signature) {
//       return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
//     }

//     const customerDetails = JSON.parse(customerDetailsStr);

//     session = await mongoose.startSession();
//     session.startTransaction();

//     const product = await Product.findOne({ productCode: productCode.toUpperCase() }).session(session);
//     if (!product || product.status !== "AVAILABLE" || product.availableStock <= 0) {
//       await session.abortTransaction();
//       return NextResponse.json({ error: "Sorry, this product has just been sold out." }, { status: 400 });
//     }

//     const updateResult = await Product.updateOne(
//       { _id: product._id, availableStock: { $gte: 1 } },
//       {
//         $inc: { availableStock: -1, reservedStock: 1 },
//         $set: { status: product.availableStock === 1 ? "SOLD_OUT" : "AVAILABLE" },
//       },
//       { session }
//     );

//     if (updateResult.modifiedCount === 0) {
//       await session.abortTransaction();
//       return NextResponse.json({ error: "Sorry, this product has just been sold out." }, { status: 400 });
//     }

//     const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

//     let referenceImageKey: string | undefined;
//     if (referencePhoto && referencePhoto.size > 0) {
//       const refBuffer = Buffer.from(await referencePhoto.arrayBuffer());
//       const refFileName = `reference-photos/${orderNumber}/${referencePhoto.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
//       referenceImageKey = await uploadToS3(refBuffer, refFileName, referencePhoto.type);
//     }

//     let customer = await Customer.findOne({ mobile: customerDetails.mobile }).session(session);
//     if (!customer) {
//       customer = new Customer({
//         name: customerDetails.name,
//         mobile: customerDetails.mobile,
//         whatsapp: customerDetails.whatsapp,
//       });
//       await customer.save({ session });
//     }

//     // Gateway payment is instantly confirmed — no manual verification needed
//     const order = new Order({
//       orderNumber,
//       productId: product._id,
//       productCodeSnapshot: product.productCode,
//       customerId: customer._id,
//       amount: product.price,
//       priceSnapshot: product.price,
//       paymentStatus: "VERIFIED",
//       orderStatus: "CONFIRMED",
//       reservationExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // safety expiry, already confirmed
//       referenceImageKey,
//     });
//     await order.save({ session });

//     const address = new ShippingAddress({
//       orderId: order._id,
//       address: customerDetails.address,
//       city: customerDetails.city,
//       state: customerDetails.state,
//       pincode: customerDetails.pincode,
//     });
//     await address.save({ session });

//     const payment = new Payment({
//       orderId: order._id,
//       amount: product.price,
//       method: "GATEWAY",
//       status: "VERIFIED",
//       verifiedAt: new Date(),
//       gatewayProvider: "razorpay",
//       gatewayTransactionId: razorpay_payment_id,
//       gatewayPayload: { razorpay_order_id, razorpay_payment_id },
//     });
//     await payment.save({ session });

//     // Stock is directly sold (not just reserved) since payment is instantly confirmed
//     await Product.updateOne({ _id: product._id }, { $inc: { reservedStock: -1 } }, { session });

//     const stockTx = new StockTransaction({
//       productId: product._id,
//       type: "SALE",
//       quantity: -1,
//       orderId: order._id,
//       reason: "Online payment via Razorpay — auto-confirmed",
//     });
//     await stockTx.save({ session });
// a
//     await session.commitTransaction();
//     session.endSession();

//     return NextResponse.json({ success: true, orderNumber });
//   } catch (error) {
//     if (session) {
//       await session.abortTransaction();
//       session.endSession();
//     }
//     console.error("Razorpay verify error:", error);
//     return NextResponse.json({ error: "Failed to confirm order. Please try again." }, { status: 500 });
//   }
// }



import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";

import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { StockTransaction } from "@/models/StockTransaction";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    await dbConnect();

    const formData = await request.formData();

    const razorpayOrderId = String(
      formData.get("razorpay_order_id") || ""
    ).trim();

    const razorpayPaymentId = String(
      formData.get("razorpay_payment_id") || ""
    ).trim();

    const razorpaySignature = String(
      formData.get("razorpay_signature") || ""
    ).trim();

    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        { error: "Missing Razorpay payment details." },
        { status: 400 }
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET is missing");

      return NextResponse.json(
        { error: "Razorpay secret is not configured on server." },
        { status: 500 }
      );
    }

    /*
     * IMPORTANT:
     * First find the Payment created by /create.
     *
     * /create route stores:
     * gatewayPayload: {
     *   razorpayOrderId: razorpayOrder.id
     * }
     */

    const pendingPayment = await Payment.findOne({
      gatewayProvider: "razorpay",
      status: "PENDING",
      "gatewayPayload.razorpayOrderId": razorpayOrderId,
    });

    if (!pendingPayment) {
      /*
       * Idempotency:
       * Maybe this payment was already verified.
       */
      const alreadyVerified = await Payment.findOne({
        gatewayProvider: "razorpay",
        gatewayTransactionId: razorpayPaymentId,
        status: "VERIFIED",
      });

      if (alreadyVerified) {
        const existingOrder = await Order.findById(
          alreadyVerified.orderId
        );

        return NextResponse.json({
          success: true,
          orderNumber: existingOrder?.orderNumber,
          alreadyVerified: true,
        });
      }

      console.error(
        "Pending Razorpay payment not found:",
        razorpayOrderId
      );

      return NextResponse.json(
        {
          error:
            "Payment record not found. Please contact support before making another payment.",
        },
        { status: 404 }
      );
    }

    /*
     * SECURITY:
     * Use the Razorpay order ID stored in our DB.
     *
     * Do NOT trust a different order ID supplied by browser.
     */
    const storedRazorpayOrderId =
      pendingPayment.gatewayPayload?.razorpayOrderId;

    if (!storedRazorpayOrderId) {
      console.error(
        "Payment does not contain stored Razorpay order ID:",
        pendingPayment._id
      );

      return NextResponse.json(
        { error: "Payment record is incomplete." },
        { status: 500 }
      );
    }

    if (storedRazorpayOrderId !== razorpayOrderId) {
      console.error(
        "Razorpay order ID mismatch",
        {
          stored: storedRazorpayOrderId,
          received: razorpayOrderId,
        }
      );

      return NextResponse.json(
        { error: "Payment verification failed." },
        { status: 400 }
      );
    }

    /*
     * Verify Razorpay signature.
     *
     * Razorpay:
     * HMAC_SHA256(order_id + "|" + payment_id, key_secret)
     */
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(
        `${storedRazorpayOrderId}|${razorpayPaymentId}`
      )
      .digest("hex");

    const signaturesMatch =
      generatedSignature.length === razorpaySignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(generatedSignature, "utf8"),
        Buffer.from(razorpaySignature, "utf8")
      );

    if (!signaturesMatch) {
      console.error("Razorpay signature mismatch");

      return NextResponse.json(
        { error: "Payment verification failed." },
        { status: 400 }
      );
    }

    /*
     * Signature is valid.
     *
     * Now update the EXISTING order/payment created by /create.
     */
    session = await mongoose.startSession();
    session.startTransaction();

    const payment = await Payment.findById(
      pendingPayment._id
    ).session(session);

    if (!payment) {
      throw new Error("Payment record disappeared.");
    }

    /*
     * Idempotency check inside transaction.
     */
    if (payment.status === "VERIFIED") {
      const existingOrder = await Order.findById(
        payment.orderId
      ).session(session);

      await session.commitTransaction();
      session.endSession();
      session = null;

      return NextResponse.json({
        success: true,
        orderNumber: existingOrder?.orderNumber,
        alreadyVerified: true,
      });
    }

    /*
     * Find the EXISTING order.
     */
    const order = await Order.findById(
      payment.orderId
    ).session(session);

    if (!order) {
      throw new Error(
        `Order not found for payment ${payment._id}`
      );
    }

    /*
     * Find product from existing order.
     */
    const product = await Product.findById(
      order.productId
    ).session(session);

    if (!product) {
      throw new Error(
        `Product not found for order ${order.orderNumber}`
      );
    }

    /*
     * Existing /create route already reserved:
     *
     * availableStock -= 1
     * reservedStock += 1
     *
     * Therefore DO NOT decrement availableStock again.
     */

    /*
     * Convert reservation into SALE:
     *
     * reservedStock -= 1
     */
    const stockResult = await Product.updateOne(
      {
        _id: product._id,
        reservedStock: { $gte: 1 },
      },
      {
        $inc: {
          reservedStock: -1,
        },
      },
      { session }
    );

    if (stockResult.modifiedCount === 0) {
      throw new Error(
        `Reserved stock not found for order ${order.orderNumber}`
      );
    }

    /*
     * Update Order.
     */
    order.paymentStatus = "VERIFIED";
    order.orderStatus = "CONFIRMED";

    await order.save({ session });

    /*
     * Update existing Payment.
     */
    payment.status = "VERIFIED";
    payment.verifiedAt = new Date();
    payment.gatewayTransactionId = razorpayPaymentId;

    payment.gatewayPayload = {
      ...(payment.gatewayPayload || {}),
      razorpayOrderId: storedRazorpayOrderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    };

    await payment.save({ session });

    /*
     * Stock audit.
     */
    const stockTx = new StockTransaction({
      productId: product._id,
      type: "SALE",
      quantity: -1,
      orderId: order._id,
      reason: "Online payment via Razorpay — auto-confirmed",
    });

    await stockTx.save({ session });

    await session.commitTransaction();
    session.endSession();
    session = null;

    console.log(
      "Razorpay order verified successfully:",
      order.orderNumber
    );

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
    });
  } catch (error: any) {
    console.error("Razorpay verify error:", error);

    if (session) {
      try {
        await session.abortTransaction();
      } catch {}

      session.endSession();
      session = null;
    }

    /*
     * Development mein actual error console mein dikhega.
     */
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? error?.message || "Failed to confirm order."
            : "Failed to confirm order. Please try again.",
      },
      { status: 500 }
    );
  }
}


