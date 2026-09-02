import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IOrder extends Document {
  orderNumber: string;
  productId: mongoose.Types.ObjectId;
  productCodeSnapshot: string;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  priceSnapshot: number;
paymentStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CANCELLED';

  orderStatus:
    | 'PENDING_PAYMENT_VERIFICATION'
    | 'CONFIRMED'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'EXPIRED';
  reservationExpiresAt: Date;

  // dispatch tracking
  dispatchedAt?: Date;
  dispatchedById?: mongoose.Types.ObjectId;
  courierName?: string;
  trackingId?: string;
  referenceImageKey?: string; 
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productCodeSnapshot: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true },
    priceSnapshot: { type: Number, required: true },
    paymentStatus: {
      type: String,
     enum: ['PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },
    orderStatus: {
      type: String,
      enum: [
        'PENDING_PAYMENT_VERIFICATION',
        'CONFIRMED',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'EXPIRED',
      ],
      default: 'PENDING_PAYMENT_VERIFICATION',
    },
    reservationExpiresAt: { type: Date, required: true },

    dispatchedAt: { type: Date },
    dispatchedById: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    courierName: { type: String },
    trackingId: { type: String },
    referenceImageKey: { type: String },
    quantity: { type: Number, default: 1 },
  },
  { timestamps: true },
    
);

OrderSchema.index({ paymentStatus: 1, orderStatus: 1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);