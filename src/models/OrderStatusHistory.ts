import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IOrderStatusHistory extends Document {
  orderId: mongoose.Types.ObjectId;
  fromStatus?: string;
  toStatus: string;
  note?: string;
  createdAt: Date;
}

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    fromStatus: { type: String },
    toStatus: { type: String, required: true },
    note: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const OrderStatusHistory: Model<IOrderStatusHistory> =
  mongoose.models.OrderStatusHistory || mongoose.model<IOrderStatusHistory>('OrderStatusHistory', OrderStatusHistorySchema);
