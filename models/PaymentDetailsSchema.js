import mongoose from "mongoose";

const PaymentDetailsSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true }, // link to Member
  paymentSource: { type: String, required: true },
  firstPaymentDate: { type: Date },
  firstPaymentTime: { type: String }, // store separately if needed
  paymentId: { type: String, unique: true },
  firstEntryDate: { type: Date },
  renewalPaymentDate: { type: Date },
  renewalPaymentTime: { type: String },
  finalPackageName: { type: String },
  finalAmount: { type: Number },
  renewalCount: { type: Number, default: 0 }
}, { timestamps: true })

export const PaymentDetails = mongoose.model("PaymentDetails", PaymentDetailsSchema);