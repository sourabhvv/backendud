import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String },
  amount: { type: Number, required: true },
  membershipNo:{type:String,require:true},
  source: { type: String, enum: ["cash", "cheque", "upi", "card", "netbanking", "wallet"], required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["success", "failed", "pending"], default: "success" }
}, { timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true }, // e.g. INV-2025-001
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
  membershipNo: { type: String, required: true },
  
  packageName: { type: String, required: true }, // plan at time of billing
  description: { type: String }, // e.g. "Annual Membership Renewal"

  amount: { type: Number, required: true }, // base amount
  gstAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true }, // final payable

  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },

  payments: [PaymentSchema], // payments made against this invoice

  status: {
    type: String,
    enum: ["pending", "partially_paid", "paid", "cancelled"],
    default: "pending"
  },

  paymentinfo:{
    type:String,
  },
  pdfUrl: {
    type: String,
  }
}, { timestamps: true });

export const Invoice = mongoose.model("Invoice", InvoiceSchema);
