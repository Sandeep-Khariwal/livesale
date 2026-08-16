import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IOrder extends Document {
  orderNumber: string;
  productId: mongoose.Types.ObjectId;
  productCodeSnapshot: string;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  priceSnapshot: number;
  paymentStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  // NOTE: added 'SHIPPED' and 'DELIVERED' so the dispatch flow has somewhere to go
  orderStatus:
    | 'PENDING_PAYMENT_VERIFICATION'
    | 'CONFIRMED'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'EXPIRED';
  reservationExpiresAt: Date;

  // --- NEW: dispatch tracking fields ---
  dispatchedAt?: Date;
  dispatchedById?: mongoose.Types.ObjectId; // which admin dispatched it
  courierName?: string;
  trackingId?: string;

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
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
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
  },
  { timestamps: true }
);

// speeds up the dispatch page query (paymentStatus + orderStatus filter)
OrderSchema.index({ paymentStatus: 1, orderStatus: 1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);