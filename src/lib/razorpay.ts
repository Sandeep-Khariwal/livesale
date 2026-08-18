import Razorpay from "razorpay";
import crypto from "crypto";
// import dotenv from "dotenv";

// dotenv.config();
// console.log(process.env.RAZORPAY_KEY_SECRET)
// console.log(process.env.RAZORPAY_KEY_ID);

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    // Don't throw at import time (breaks build) — routes will fail loudly instead if used without keys.
    console.warn("[razorpay] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.");
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});