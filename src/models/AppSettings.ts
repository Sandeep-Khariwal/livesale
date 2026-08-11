import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAppSettings extends Document {
  reservationWindowMinutes: number;
  upiId?: string;
  qrCodeImageKey?: string;
  updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    reservationWindowMinutes: { type: Number, default: 15 },
    upiId: { type: String },
    qrCodeImageKey: { type: String },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const AppSettings: Model<IAppSettings> =
  mongoose.models.AppSettings || mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);
