import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProduct extends Document {
  productCode: string;
  price: number;
  imageKey?: string;
  initialStock: number;
  availableStock: number;
  reservedStock: number;
  status: 'AVAILABLE' | 'SOLD_OUT' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    productCode: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    imageKey: { type: String },
    initialStock: { type: Number, required: true },
    availableStock: { type: Number, required: true },
    reservedStock: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['AVAILABLE', 'SOLD_OUT', 'INACTIVE'],
      default: 'AVAILABLE',
    },
  },
  { timestamps: true }
);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
