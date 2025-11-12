import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: "Membership", required: true },
    membershipNo: { type: String, required: true },
    fileName: { type: String },
    pdfUrl: { type: String, required: true },
    pdfId: { type: String },
    version: { type: Number, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

certificateSchema.index({ membership: 1, version: -1 });

export default mongoose.model("Certificate", certificateSchema);

