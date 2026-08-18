import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Order } from "@/models/Order";
import { getSignedS3Url } from "@/lib/s3";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order || !order.referenceImageKey) {
      return NextResponse.json({ error: "No reference photo found for this order" }, { status: 404 });
    }

    const signedUrl = await getSignedS3Url(order.referenceImageKey, 300);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("Reference photo fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}