import * as pricingService from "../services/pricingService.js";

export const createPricing = async (req, res) => {
  try {
    const pricing = await pricingService.createPricing({
      ...req.body,
      owner: req.user?.id || req.body.owner,
    });
    res.status(201).json({ success: true, data: pricing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
// 
export const getAllPricing = async (req, res) => {
  try {
    const pricings = await pricingService.getAllPricing();
    res.json({ success: true, data: pricings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//My pricing if user has a membership plan athan show in the pricng 
export const getMyPricing = async (req, res) => {
  try {
    const pricings = await pricingService.getMyPricing(req.user?.id);
    res.json({ success: true, data: pricings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};




export const getPricingById = async (req, res) => {
  try {
    const pricing = await pricingService.getPricingById(req.params.id);
    if (!pricing) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, data: pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePricing = async (req, res) => {
  try {
    const pricing = await pricingService.updatePricing(req.params.id, req.body);
    res.json({ success: true, data: pricing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deletePricing = async (req, res) => {
  try {
    await pricingService.deletePricing(req.params.id);
    res.json({ success: true, message: "Pricing deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const togglePricingStatus = async (req, res) => {
  try {
    const pricing = await pricingService.togglePricingStatus(req.params.id);
    res.json({ success: true, data: pricing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
