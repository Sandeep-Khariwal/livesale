import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { ShippingAddress } from "@/models/ShippingAddress";
import { Payment } from "@/models/Payment";
import { StockTransaction } from "@/models/StockTransaction";
import { AppSettings } from "@/models/AppSettings";
import { uploadToS3 } from "@/lib/s3";

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;
  try {
    await dbConnect();
    
    const formData = await request.formData();
    const screenshot = formData.get("screenshot") as File;
    const productCode = formData.get("productCode") as string;
    const customerDetailsStr = formData.get("customerDetails") as string;

    if (!screenshot || !productCode || !customerDetailsStr) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const customerDetails = JSON.parse(customerDetailsStr);

    // Start Mongoose Transaction for atomic operations
    session = await mongoose.startSession();
    session.startTransaction();

    // 1. Validate Product & Check Stock atomically
    const product = await Product.findOne({ productCode: productCode.toUpperCase() }).session(session);

    if (!product || product.status !== "AVAILABLE" || product.availableStock <= 0) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Sorry, this product has just been sold out." }, { status: 400 });
    }

    // Atomically reserve stock
    const updateResult = await Product.updateOne(
      { _id: product._id, availableStock: { $gte: 1 } },
      {
        $inc: { availableStock: -1, reservedStock: 1 },
        $set: { status: product.availableStock === 1 ? "SOLD_OUT" : "AVAILABLE" }
      },
      { session }
    );

    if (updateResult.modifiedCount === 0) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Sorry, this product has just been sold out." }, { status: 400 });
    }

    // 2. Upload Screenshot to S3
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const arrayBuffer = await screenshot.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `payments/${orderNumber}/${screenshot.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    
    // Note: S3 upload is not part of the DB transaction, but we do it before committing.
    // If S3 fails, the catch block will abort the DB transaction.
    const s3Key = await uploadToS3(buffer, fileName, screenshot.type);

    // 3. Create or Find Customer
    let customer = await Customer.findOne({ mobile: customerDetails.mobile }).session(session);
    if (!customer) {
      customer = new Customer({
        name: customerDetails.name,
        mobile: customerDetails.mobile,
        whatsapp: customerDetails.whatsapp,
      });
      await customer.save({ session });
    }

    // 4. Determine Expiration Window
    const settings = await AppSettings.findOne().session(session);
    const windowMinutes = settings?.reservationWindowMinutes || 15;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + windowMinutes);

    // 5. Create Order
    const order = new Order({
      orderNumber,
      productId: product._id,
      productCodeSnapshot: product.productCode,
      customerId: customer._id,
      amount: product.price,
      priceSnapshot: product.price,
      paymentStatus: "PENDING",
      orderStatus: "PENDING_PAYMENT_VERIFICATION",
      reservationExpiresAt: expiresAt,
    });
    await order.save({ session });

    // 6. Create Shipping Address
    const address = new ShippingAddress({
      orderId: order._id,
      address: customerDetails.address,
      city: customerDetails.city,
      state: customerDetails.state,
      pincode: customerDetails.pincode,
    });
    await address.save({ session });

    // 7. Create Payment Record
    const payment = new Payment({
      orderId: order._id,
      amount: product.price,
      method: "MANUAL_UPI",
      status: "PENDING",
      screenshotKey: s3Key,
    });
    await payment.save({ session });

    // 8. Create Stock Transaction Audit
    const stockTx = new StockTransaction({
      productId: product._id,
      type: "RESERVATION",
      quantity: -1,
      orderId: order._id,
      reason: "Order Placed",
    });
    await stockTx.save({ session });

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, orderNumber });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order. Please try again." }, { status: 500 });
  }
}
