import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongoose";
import { AdminUser } from "@/models/AdminUser";

export async function POST() {
  try {
    await dbConnect();

    // Check if any admin exists
    const adminCount = await AdminUser.countDocuments();
    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Setup already completed. Admins exist." },
        { status: 400 }
      );
    }

    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in environment." },
        { status: 500 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const superAdmin = new AdminUser({
      name: "Super Admin",
      email,
      passwordHash,
      role: "SUPER_ADMIN",
    });

    await superAdmin.save();

    return NextResponse.json(
      { message: "Initial Super Admin created successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
