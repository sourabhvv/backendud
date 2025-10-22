import mongoose from "mongoose";

const pricingSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    productName: { type: String, required: true },

    price: { type: Number, required: true },

    planType: {
      type: String,
      enum: ["annual", "lifetime"],
      required: true,
    },

    currency: {
      type: String,
      default: "INR", // or USD
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    features: {
      type: [String], // Optional: store feature list
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Pricing", pricingSchema);
