import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  amount: number;
  method: 'MANUAL_UPI' | 'GATEWAY';
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  screenshotKey?: string;
  verifiedAt?: Date;
  verifiedById?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  gatewayProvider?: string;
  gatewayTransactionId?: string;
  gatewayPayload?: any;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['MANUAL_UPI', 'GATEWAY'],
      default: 'MANUAL_UPI',
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    screenshotKey: { type: String },
    verifiedAt: { type: Date },
    verifiedById: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    rejectionReason: { type: String },
    gatewayProvider: { type: String },
    gatewayTransactionId: { type: String },
    gatewayPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
