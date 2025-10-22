import express from "express";
import * as pricingController from "../controllers/admin.pricingController.js";
import { auth,requireRole } from '../middleware/auth.js';

const router = express.Router();

// Admin Pricing CRUD
router.post("/",auth,requireRole("admin"), pricingController.createPricing);
router.get("/", pricingController.getAllPricing);
router.get("/:id", pricingController.getPricingById);
router.put("/:id", pricingController.updatePricing);
router.delete("/:id", pricingController.deletePricing);

// Toggle active/inactive
router.patch("/:id/toggle", pricingController.togglePricingStatus);

export default router;
