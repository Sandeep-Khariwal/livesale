import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";
import ProductsClient from "./ProductsClient";

export const metadata = { title: "Products | OMS Admin" };

export default async function ProductsPage() {
  await dbConnect();
  // Fetching raw MongoDB documents and converting them so they can be serialized
  const rawProducts = await Product.find().sort({ createdAt: -1 }).lean();
  
  // Serialize ObjectIds
  const products = rawProducts.map((p: any) => ({
    ...p,
    _id: p._id.toString(),

    createdAt: p.createdAt ? p.createdAt.toISOString() : null,
    updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
  }));

  return <ProductsClient initialProducts={products} />;
}
