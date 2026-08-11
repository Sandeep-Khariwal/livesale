import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { AppSettings } from "@/models/AppSettings";

export async function GET() {
  try {
    await dbConnect();
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = new AppSettings({ upiId: "example@upi" });
      await settings.save();
    }

    return NextResponse.json({
      upiId: settings.upiId,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
