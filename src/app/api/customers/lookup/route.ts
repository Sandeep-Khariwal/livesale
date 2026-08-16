import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { ShippingAddress } from "@/models/ShippingAddress";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const mobile = request.nextUrl.searchParams.get("mobile");

    if (!mobile) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    const customer = await Customer.findOne({ mobile: mobile.trim() });

    if (!customer) {
      return NextResponse.json({ found: false });
    }

    // Get the most recent order by this customer, to pull their last used address
    const lastOrder = await Order.findOne({ customerId: customer._id }).sort({ createdAt: -1 });

    let address = null;
    if (lastOrder) {
      address = await ShippingAddress.findOne({ orderId: lastOrder._id });
    }

    return NextResponse.json({
      found: true,
      customer: {
        name: customer.name,
        mobile: customer.mobile,
      },
      address: address
        ? {
            address: address.address,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          }
        : null,
    });
  } catch (error) {
    console.error("Customer lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}