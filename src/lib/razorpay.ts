import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();
console.log(process.env.RAZORPAY_API_KEY_Live)
console.log(process.env.RAZORPAY_API_SECRET_Live);

if (!process.env.RAZORPAY_API_KEY_Live || !process.env.RAZORPAY_API_SECRET_Live) {
    // Don't throw at import time (breaks build) — routes will fail loudly instead if used without keys.
    console.warn("[razorpay] RAZORPAY_API_KEY_Live / RAZORPAY_KEY_SECRET are not set.");
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY_Live as string,
  key_secret: process.env.RAZORPAY_API_SECRET_Live as string,
});