import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { AppSettings } from "@/models/AppSettings";
import { getSignedS3Url } from "@/lib/s3";

export async function GET() {
  try {
    await dbConnect();
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = new AppSettings({ upiId: "example@upi" });
      await settings.save();
    }

    const qrCodeImageUrl = settings.qrCodeImageKey
      ? await getSignedS3Url(settings.qrCodeImageKey, 3600)
      : null;

    return NextResponse.json({
      upiId: settings.upiId,
      qrCodeImageUrl, // NEW
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}