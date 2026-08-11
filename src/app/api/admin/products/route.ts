import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";
import { StockTransaction } from "@/models/StockTransaction";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { productCode, price, initialStock, imageKey } = body;

    if (!productCode || !price) {
      return NextResponse.json({ error: "Product Code and Price are required" }, { status: 400 });
    }

    const stock = Number(initialStock || 0);

    const newProduct = new Product({
      productCode: productCode.toUpperCase(),
      price: Number(price),
      imageKey,
      initialStock: stock,
      availableStock: stock,
      reservedStock: 0,
      status: stock > 0 ? "AVAILABLE" : "SOLD_OUT",
    });

    await newProduct.save();

    if (stock > 0) {
      const stockTx = new StockTransaction({
        productId: newProduct._id,
        type: "INITIAL_STOCK",
        quantity: stock,
        reason: "Initial stock setting",
      });
      await stockTx.save();
    }

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Product Code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, price, availableStock, imageKey } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (price !== undefined) product.price = Number(price);
    if (imageKey !== undefined) product.imageKey = imageKey;
    
    // Admin editing stock directly updates availableStock and status
    if (availableStock !== undefined) {
      const newStock = Number(availableStock);
      
      // Calculate difference for transaction history
      const diff = newStock - product.availableStock;
      
      if (diff !== 0) {
        const stockTx = new StockTransaction({
          productId: product._id,
          type: "MANUAL_ADJUSTMENT",
          quantity: diff,
          reason: "Admin manual stock edit",
        });
        await stockTx.save();
      }

      product.availableStock = newStock;
      product.status = newStock > 0 ? "AVAILABLE" : "SOLD_OUT";
    }

    await product.save();

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    product.status = "INACTIVE"; // Soft delete to preserve order history
    await product.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
