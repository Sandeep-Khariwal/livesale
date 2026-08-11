import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IShippingAddress extends Document {
  orderId: mongoose.Types.ObjectId;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { timestamps: false }
);

export const ShippingAddress: Model<IShippingAddress> =
  mongoose.models.ShippingAddress || mongoose.model<IShippingAddress>('ShippingAddress', ShippingAddressSchema);
