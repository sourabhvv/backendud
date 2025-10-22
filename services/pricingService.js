import Pricing from "../models/pricing.js";

export const createPricing = async (data) => {
  const pricing = new Pricing(data);
  return await pricing.save();
};

export const getAllPricing = async () => {
  return await Pricing.find().populate("owner", "name email");
};

export const getPricingById = async (id) => {
  return await Pricing.findById(id).populate("owner", "name email");
};

export const updatePricing = async (id, updates) => {
  return await Pricing.findByIdAndUpdate(id, updates, { new: true });
};

export const deletePricing = async (id) => {
  return await Pricing.findByIdAndDelete(id);
};

export const togglePricingStatus = async (id) => {
  const pricing = await Pricing.findById(id);
  if (!pricing) throw new Error("Pricing not found");

  pricing.status = pricing.status === "active" ? "inactive" : "active";
  return await pricing.save();
};
