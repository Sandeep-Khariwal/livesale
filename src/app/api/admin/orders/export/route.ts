import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/mongoose";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { Product } from "@/models/Product";
import { ShippingAddress } from "@/models/ShippingAddress";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const status = request.nextUrl.searchParams.get("status"); // PENDING | VERIFIED | REJECTED | null (all)

    const filter: Record<string, any> = {};
    if (status && ["PENDING", "VERIFIED", "REJECTED"].includes(status)) {
      filter.paymentStatus = status;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();

    const rows = await Promise.all(
      orders.map(async (order: any) => {
        const [customer, product, address] = await Promise.all([
          Customer.findById(order.customerId).lean() as Promise<any>,
          Product.findById(order.productId).lean() as Promise<any>,
          ShippingAddress.findOne({ orderId: order._id }).lean() as Promise<any>,
        ]);

        return {
          "Order Number": order.orderNumber,
          "Date": order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "",
          "Product Code": order.productCodeSnapshot || product?.productCode || "",
          "Amount (₹)": order.amount,
          "Customer Name": customer?.name || "",
          "Mobile": customer?.mobile || "",
          "WhatsApp": customer?.whatsapp || "",
          "Address": address?.address || "",
          "City": address?.city || "",
          "landmark":address?.landmark || "",
          "State": address?.state || "",
          "Pincode": address?.pincode || "",
          "Payment Status": order.paymentStatus,
          "Order Status": order.orderStatus,
        };
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-width columns roughly
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r: any) => String(r[key] ?? "").length)) + 2,
    }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const filename = `orders-${status ? status.toLowerCase() : "all"}-${Date.now()}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return NextResponse.json({ error: "Failed to generate Excel file" }, { status: 500 });
  }
}