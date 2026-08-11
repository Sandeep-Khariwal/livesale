import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  mobile: string;
  whatsapp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    whatsapp: { type: String },
  },
  { timestamps: true }
);

CustomerSchema.index({ mobile: 1 });

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
