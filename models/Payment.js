import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String },
  amount: { type: Number, required: true },
  membershipNo:{type:String,require:true},
  source: { type: String, enum: ["cash", "cheque", "upi", "card", "netbanking", "wallet"], required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["success", "failed", "pending"], default: "success" }
}, { timestamps: true });

export const Payment = mongoose.model("payment", PaymentSchema);
