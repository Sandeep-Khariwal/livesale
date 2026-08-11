import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { AppSettings } from "@/models/AppSettings";

export async function GET() {
  try {
    await dbConnect();
    // Use the singleton document or create one if it doesn't exist
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = new AppSettings({
        upiId: "example@upi",
      });
      await settings.save();
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { upiId } = body;

    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = new AppSettings({ upiId });
    } else {
      if (upiId !== undefined) settings.upiId = upiId;
    }
    
    await settings.save();

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
