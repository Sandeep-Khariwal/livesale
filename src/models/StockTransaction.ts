import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStockTransaction extends Document {
  productId: mongoose.Types.ObjectId;
  type: 'INITIAL_STOCK' | 'RESERVATION' | 'RESERVATION_RELEASE' | 'SALE' | 'RESTOCK' | 'MANUAL_ADJUSTMENT';
  quantity: number;
  orderId?: mongoose.Types.ObjectId;
  reason?: string;
  createdById?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: {
      type: String,
      enum: [
        'INITIAL_STOCK',
        'RESERVATION',
        'RESERVATION_RELEASE',
        'SALE',
        'RESTOCK',
        'MANUAL_ADJUSTMENT',
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    reason: { type: String },
    createdById: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockTransactionSchema.index({ productId: 1, createdAt: -1 });

export const StockTransaction: Model<IStockTransaction> =
  mongoose.models.StockTransaction || mongoose.model<IStockTransaction>('StockTransaction', StockTransactionSchema);
