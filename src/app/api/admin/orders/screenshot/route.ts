import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Payment } from "@/models/Payment";
import { getSignedS3Url } from "@/lib/s3";

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    await dbConnect();
    const payment = await Payment.findOne({ orderId });

    if (!payment || !payment.screenshotKey) {
      return NextResponse.json({ error: "No payment screenshot found" }, { status: 404 });
    }

    const signedUrl = await getSignedS3Url(payment.screenshotKey);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("Screenshot fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
