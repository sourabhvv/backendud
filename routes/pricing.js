import Router from "express";
import { auth } from "../middleware/auth.js";
import * as pricingService from "../services/pricingService.js";

const router = Router();
router.get("/getAllPricing", auth, async (req, res) => {
  try {
    const pricings = await pricingService.getAllPricing();
    res.status(200).json({ pricings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get pricing" });
  }
});

export default router;