import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Product code is required" }, { status: 400 });
    }

    const product = await Product.findOne({ productCode: code.toUpperCase() });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return returnProductStatus(product);
  } catch (error) {
    console.error("Error checking product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function returnProductStatus(product: any) {
  if (product.status !== "AVAILABLE" || product.availableStock <= 0) {
    return NextResponse.json({
      available: false,
      product: {
        id: product._id,
        code: product.productCode,
        price: product.price,
        status: "SOLD_OUT",
      },
    });
  }

  return NextResponse.json({
    available: true,
    product: {
      id: product._id,
      code: product.productCode,
      price: product.price,
      stock: product.availableStock,
      status: "AVAILABLE",
    },
  });
}
