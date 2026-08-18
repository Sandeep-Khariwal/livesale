// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";
// import dbConnect from "@/lib/mongoose";
// import { razorpay } from "@/lib/razorpay";
// import { Product } from "@/models/Product";
// import { Customer } from "@/models/Customer";
// import { Order } from "@/models/Order";
// import { ShippingAddress } from "@/models/ShippingAddress";
// import { Payment } from "@/models/Payment";

// export const runtime = "nodejs";

// /*
//  * IMPORTANT — ye route ab "verify" ke expectations ke saath match karta hai:
//  *
//  * 1. Product check karo + stock reserve karo (availableStock -1, reservedStock +1)
//  * 2. Customer upsert karo
//  * 3. Order banao with paymentStatus: "PENDING"
//  * 4. ShippingAddress banao
//  * 5. Payment banao with status: "PENDING", gatewayProvider: "razorpay"
//  * 6. Sab kuch commit hone ke baad Razorpay order create karo
//  * 7. Payment.gatewayPayload mein razorpayOrderId save karo
//  *
//  * NOTE: referencePhoto upload yahan nahi hai — agar chahiye toh yahin
//  * form-data se accept karke S3 pe upload karo aur Order.referenceImageKey
//  * mein save karo. Field names (Order/Customer/ShippingAddress) apne actual
//  * schema ke against verify kar lena, maine ye purane commented code se liye hain.
//  */

// interface CustomerDetailsInput {
//   name?: string;
//   mobile?: string;
//   whatsapp?: string;
//   address?: string;
//   city?: string;
//   state?: string;
//     landmark?: string;   // NEW
//   pincode?: string;
// }

// export async function POST(request: NextRequest) {
//   let session: mongoose.ClientSession | null = null;

//   try {
//     await dbConnect();

//     const body = await request.json();
//     const productCode = String(body.productCode || "").trim();
//     const customerDetails: CustomerDetailsInput = body.customerDetails || {};

//     if (!productCode) {
//       return NextResponse.json(
//         { error: "Product code is required" },
//         { status: 400 }
//       );
//     }

//     const name = customerDetails.name?.trim();
//     const mobile = customerDetails.mobile?.trim();

//     if (!name || !mobile) {
//       return NextResponse.json(
//         { error: "Customer name aur mobile number zaroori hai." },
//         { status: 400 }
//       );
//     }

//     if (!/^[6-9]\d{9}$/.test(mobile)) {
//       return NextResponse.json(
//         { error: "Valid 10-digit mobile number bharein." },
//         { status: 400 }
//       );
//     }

//     // ShippingAddress schema mein ye sab fields required: true hain,
//     // isliye transaction shuru karne se pehle hi validate kar lo —
//     // warna stock reserve hoke phir rollback hoga aur customer ko
//     // generic 500 error milega.
//     const address = customerDetails.address?.trim();
//     const city = customerDetails.city?.trim();
//     const landmark = customerDetails.landmark?.trim();   
//     const state = customerDetails.state?.trim();
//     const pincode = customerDetails.pincode?.trim();
//     if (!address || !city || !state || !pincode) {
//       return NextResponse.json(
//         { error: "Poora shipping address (address, city, state, pincode) bharein." },
//         { status: 400 }
//       );
//     }

//     if (!/^\d{6}$/.test(pincode)) {
//       return NextResponse.json(
//         { error: "Valid 6-digit pincode bharein." },
//         { status: 400 }
//       );
//     }

//     session = await mongoose.startSession();
//     session.startTransaction();

//     // 1. Product check + atomic stock reservation
//     const product = await Product.findOne({
//       productCode: productCode.toUpperCase(),
//     }).session(session);

//     if (!product || product.status !== "AVAILABLE" || product.availableStock <= 0) {
//       await session.abortTransaction();
//       session.endSession();
//       session = null;

//       return NextResponse.json(
//         { error: "Sorry, ye product abhi available nahi hai." },
//         { status: 400 }
//       );
//     }

//     const stockUpdate = await Product.updateOne(
//       { _id: product._id, availableStock: { $gte: 1 } },
//       {
//         $inc: { availableStock: -1, reservedStock: 1 },
//         $set: {
//           status: product.availableStock === 1 ? "SOLD_OUT" : "AVAILABLE",
//         },
//       },
//       { session }
//     );

//     if (stockUpdate.modifiedCount === 0) {
//       await session.abortTransaction();
//       session.endSession();
//       session = null;

//       return NextResponse.json(
//         { error: "Sorry, ye product abhi-abhi sold out ho gaya." },
//         { status: 400 }
//       );
//     }

//     // 2. Customer upsert
//     let customer = await Customer.findOne({ mobile }).session(session);

//     if (!customer) {
//       customer = new Customer({
//         name,
//         mobile,
//         whatsapp: customerDetails.whatsapp || mobile,
//       });
//       await customer.save({ session });
//     }

//     // 3. Order create (PENDING — payment abhi hua nahi hai)
//     const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(
//       Math.random() * 1000
//     )}`;

//     const order = new Order({
//       orderNumber,
//       productId: product._id,
//       productCodeSnapshot: product.productCode,
//       customerId: customer._id,
//       amount: product.price,
//       priceSnapshot: product.price,
//       paymentStatus: "PENDING",
//       orderStatus: "PENDING_PAYMENT_VERIFICATION",
//       reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min hold
//     });
//     await order.save({ session });

//     // 4. Shipping address — fields already validated upfront, so this
//     // always runs (schema requires all four fields).
//     const shippingAddress = new ShippingAddress({
//       orderId: order._id,
//         landmark: landmark || undefined,   // NEW — optional field

//       address,
//       city,
//       state,
//       pincode,
//     });
//     await shippingAddress.save({ session });

//     // 5. Payment record (PENDING) — Razorpay order abhi nahi bana, isliye
//     // gatewayPayload.razorpayOrderId thodi der mein set karenge (transaction
//     // ke bahar, kyunki Razorpay ek external API call hai).
//     const payment = new Payment({
//       orderId: order._id,
//       amount: product.price,
//       method: "GATEWAY",
//       status: "PENDING",
//       gatewayProvider: "razorpay",
//       gatewayPayload: {},
//     });
//     await payment.save({ session });

//     await session.commitTransaction();
//     session.endSession();
//     session = null;

//     // 6. Ab Razorpay order banao (DB transaction ke BAAHAR — external call
//     // hai, isse transaction lock lambi der tak hold nahi hoga)
//     let razorpayOrder;
//     try {
//       razorpayOrder = await razorpay.orders.create({
//         amount: Math.round(product.price * 100), // paise mein
//         currency: "INR",
//         receipt: order.orderNumber,
//         notes: {
//           productCode: product.productCode,
//           orderNumber: order.orderNumber,
//         },
//       });
//     } catch (rzpError) {
//       console.error("Razorpay order creation failed:", rzpError);

//       // Rollback: stock release + order/payment cancel karo, kyunki
//       // Razorpay order hi nahi bana.
//       await Product.updateOne(
//         { _id: product._id },
//         {
//           $inc: { availableStock: 1, reservedStock: -1 },
//           $set: { status: "AVAILABLE" },
//         }
//       );
//       await Order.updateOne(
//         { _id: order._id },
//         { $set: { orderStatus: "CANCELLED", paymentStatus: "FAILED" } }
//       );
//       await Payment.updateOne(
//         { _id: payment._id },
//         { $set: { status: "REJECTED", rejectionReason: "Gateway order create failed" } }
//       );

//       return NextResponse.json(
//         { error: "Payment start nahi ho paya. Dobara try karein." },
//         { status: 500 }
//       );
//     }

//     // 7. Payment ko Razorpay order ID ke saath update karo
//     payment.gatewayPayload = { razorpayOrderId: razorpayOrder.id };
//     await payment.save();

//     return NextResponse.json({
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       currency: razorpayOrder.currency,
//       keyId: process.env.RAZORPAY_KEY_ID,
//       orderNumber: order.orderNumber,
//     });
//   } catch (error) {
//     console.error("Razorpay create-order error:", error);

//     if (session) {
//       try {
//         await session.abortTransaction();
//       } catch {}
//       session.endSession();
//     }

//     return NextResponse.json(
//       { error: "Failed to initiate payment" },
//       { status: 500 }
//     );
//   }
// }






import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { uploadToS3 } from "@/lib/s3";
import { Product } from "@/models/Product";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { ShippingAddress } from "@/models/ShippingAddress";
import { Payment } from "@/models/Payment";

export const runtime = "nodejs";

interface CustomerDetailsInput {
  name?: string;
  mobile?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  landmark?: string;
  pincode?: string;
}

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    await dbConnect();

    // ---- FormData parse (JSON nahi, kyunki screenshot/referencePhoto file hai) ----
    const formData = await request.formData();

    const productCode = String(formData.get("productCode") || "").trim();
    const customerDetailsRaw = String(formData.get("customerDetails") || "{}");
    const screenshotFile = formData.get("screenshot") as File | null;
    const referencePhotoFile = formData.get("referencePhoto") as File | null;

    let customerDetails: CustomerDetailsInput = {};
    try {
      customerDetails = JSON.parse(customerDetailsRaw);
    } catch {
      return NextResponse.json(
        { error: "Invalid customer details." },
        { status: 400 }
      );
    }

    if (!productCode) {
      return NextResponse.json(
        { error: "Product code is required" },
        { status: 400 }
      );
    }

    if (!screenshotFile) {
      return NextResponse.json(
        { error: "Payment screenshot zaroori hai." },
        { status: 400 }
      );
    }

    const name = customerDetails.name?.trim();
    const mobile = customerDetails.mobile?.trim();

    if (!name || !mobile) {
      return NextResponse.json(
        { error: "Customer name aur mobile number zaroori hai." },
        { status: 400 }
      );
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Valid 10-digit mobile number bharein." },
        { status: 400 }
      );
    }

    const address = customerDetails.address?.trim();
    const city = customerDetails.city?.trim();
    const landmark = customerDetails.landmark?.trim();
    const state = customerDetails.state?.trim();
    const pincode = customerDetails.pincode?.trim();

    if (!address || !city || !state || !pincode) {
      return NextResponse.json(
        { error: "Poora shipping address (address, city, state, pincode) bharein." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: "Valid 6-digit pincode bharein." },
        { status: 400 }
      );
    }

    session = await mongoose.startSession();
    session.startTransaction();

    // 1. Product check + atomic stock reservation
    const product = await Product.findOne({
      productCode: productCode.toUpperCase(),
    }).session(session);

    if (!product || product.status !== "AVAILABLE" || product.availableStock <= 0) {
      await session.abortTransaction();
      session.endSession();
      session = null;
      return NextResponse.json(
        { error: "Sorry, ye product abhi available nahi hai." },
        { status: 400 }
      );
    }

    const stockUpdate = await Product.updateOne(
      { _id: product._id, availableStock: { $gte: 1 } },
      {
        $inc: { availableStock: -1, reservedStock: 1 },
        $set: {
          status: product.availableStock === 1 ? "SOLD_OUT" : "AVAILABLE",
        },
      },
      { session }
    );

    if (stockUpdate.modifiedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      session = null;
      return NextResponse.json(
        { error: "Sorry, ye product abhi-abhi sold out ho gaya." },
        { status: 400 }
      );
    }

    // 2. Customer upsert
    let customer = await Customer.findOne({ mobile }).session(session);
    if (!customer) {
      customer = new Customer({
        name,
        mobile,
        whatsapp: customerDetails.whatsapp || mobile,
      });
      await customer.save({ session });
    }

    // 3. Order create
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(
      Math.random() * 1000
    )}`;

    const order = new Order({
      orderNumber,
      productId: product._id,
      productCodeSnapshot: product.productCode,
      customerId: customer._id,
      amount: product.price,
      priceSnapshot: product.price,
      paymentStatus: "PENDING",
      orderStatus: "PENDING_PAYMENT_VERIFICATION",
      reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    await order.save({ session });

    // 4. Shipping address
    const shippingAddress = new ShippingAddress({
      orderId: order._id,
      address,
      city,
      state,
      pincode,
      landmark: landmark || undefined,
    });
    await shippingAddress.save({ session });

    // 5. Payment record (MANUAL_UPI, PENDING — screenshot verify hone ka wait)
    const payment = new Payment({
      orderId: order._id,
      amount: product.price,
      method: "MANUAL_UPI",
      status: "PENDING",
    });
    await payment.save({ session });

    await session.commitTransaction();
    session.endSession();
    session = null;

    // 6. Screenshot + reference photo S3 pe upload karo (transaction ke BAAHAR,
    // kyunki S3 upload external call hai — DB lock lambi der tak hold nahi rakhna)
    try {
      const screenshotBuffer = Buffer.from(await screenshotFile.arrayBuffer());
      const screenshotKey = `payment-screenshots/${order._id}-${Date.now()}-${screenshotFile.name}`;
      await uploadToS3(screenshotBuffer, screenshotKey, screenshotFile.type);

      payment.screenshotKey = screenshotKey;
      await payment.save();

      if (referencePhotoFile) {
        const refBuffer = Buffer.from(await referencePhotoFile.arrayBuffer());
        const refKey = `reference-photos/${order._id}-${Date.now()}-${referencePhotoFile.name}`;
        await uploadToS3(refBuffer, refKey, referencePhotoFile.type);

        order.referenceImageKey = refKey;
        await order.save();
      }
    } catch (uploadErr) {
      // Order/payment already committed — upload fail hone par order cancel
      // mat karo (customer ka paisa already jaa chuka hai maan ke chalna hai
      // manual flow mein), bas error log karo taaki admin follow up kar sake.
      console.error("Screenshot/reference upload failed after order create:", uploadErr);
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      message: "Order placed successfully. Payment verification pending.",
    });
  } catch (error) {
    console.error("Order create error:", error);

    if (session) {
      try {
        await session.abortTransaction();
      } catch {}
      session.endSession();
    }

    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}