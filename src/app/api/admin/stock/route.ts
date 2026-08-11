import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";
import { StockTransaction } from "@/models/StockTransaction";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;
  
  try {
    const { productId, adjustment, reason } = await request.json();
    
    if (!productId || typeof adjustment !== 'number' || !reason) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    await dbConnect();
    session = await mongoose.startSession();
    session.startTransaction();

    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const newAvailableStock = product.availableStock + adjustment;
    if (newAvailableStock < 0) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Adjustment would result in negative stock" }, { status: 400 });
    }

    product.availableStock = newAvailableStock;
    if (product.availableStock > 0 && product.status === "SOLD_OUT") {
      product.status = "AVAILABLE";
    } else if (product.availableStock === 0 && product.reservedStock === 0) {
      product.status = "SOLD_OUT";
    }

    await product.save({ session });

    const stockTx = new StockTransaction({
      productId: product._id,
      type: adjustment > 0 ? "RESTOCK" : "MANUAL_ADJUSTMENT",
      quantity: Math.abs(adjustment),
      reason: reason || "Manual adjustment by admin",
    });
    
    await stockTx.save({ session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, product });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const transactions = await StockTransaction.find({ productId: productId }).sort({ createdAt: -1 });

    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
