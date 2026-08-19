import dbConnect from "@/lib/mongoose";
import { Product } from "@/models/Product";
import ProductsClient from "./ProductsClient";
import { getSignedS3Url } from "@/lib/s3";

export const metadata = { title: "Products | OMS Admin" };

export default async function ProductsPage() {
  await dbConnect();
  console.log("fetch products..........");
  
  const rawProducts = await Product.find().sort({ createdAt: -1 }).lean();

  // console.log("rawProducts..........",rawProducts);

  const products = await Promise.all(
    rawProducts.map(async (p: any) => ({
      ...p,
      _id: p._id.toString(),
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
      // imageUrl: p.imageKey ?? null, // NEW
            imageUrl: p.imageKey ? await getSignedS3Url(p.imageKey, 3600) : null,   // ✅ fix

    }))
  );

  return <ProductsClient initialProducts={products} />;
}