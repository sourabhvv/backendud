import mongoose from "mongoose";

const PackageTakenSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    firstPackageName: { type: String, required: true },
    membershipFeesAmount: { type: Number, required: true }, // Inclusive of GST
  },
  { timestamps: true }
);

export default mongoose.model("PackageTaken", PackageTakenSchema);
