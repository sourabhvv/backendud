import express from "express";
import axios from "axios";
import Organization from "../models/Organization.js";
import MemberShip from "../models/MemberShip.js";
import Certificate from "../models/Certificate.js";
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Your deployed Apps Script Web App URL
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-xcOIcMZU01WvYrl3Y2yrl-gujyNfLvgqvrT8l9J62idnvYyCvv538L2vcB6qIHzf5A/exec';

// Helper function to format period
function formatPeriod(joinDate, expireDate) {
  try {
    const options = { month: "short", year: "numeric" };
    const joinStr = new Date(joinDate).toLocaleDateString("en-US", options);
    const expireStr = new Date(expireDate).toLocaleDateString("en-US", options);
    return `${joinStr} - ${expireStr}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid Date Range";
  }
}

// Endpoint: generate certificate and download PDF
router.get("/download", auth, async (req, res) => {
  try {
    console.log("=== Certificate Generation Started ===");
    console.log("User ID:", req.user?.id);

    // Fetch organization based on logged-in user
    const org = await Organization.findOne({ owner: req.user.id });
    console.log("Organization found:", org ? "Yes" : "No");
    
    if (!org) {
      return res.status(404).json({ 
        error: "No organization profile found",
        userId: req.user.id 
      });
    }

    if (!org.membershipNo) {
      return res.status(400).json({ 
        error: "Organization has no membership number"
      });
    }

    // Fetch membership linked to the org
    const membership = await MemberShip.findOne({ membershipNo: org.membershipNo });
    console.log("Membership found:", membership ? "Yes" : "No");
    
    if (!membership) {
      return res.status(404).json({ 
        error: "Membership not found",
        membershipNo: org.membershipNo 
      });
    }

    if (!membership.JoinDate || !membership.ExpireDate) {
      return res.status(400).json({ 
        error: "Invalid membership dates"
      });
    }

    // Format period
    const period = formatPeriod(membership.JoinDate, membership.ExpireDate);

    // Prepare data for Apps Script
    const templateData = {
      customerName: org.entityName || "N/A",
      period: period,
      date: new Date().toLocaleDateString("en-GB"),
      membershipNo: membership.membershipNo || "N/A",
    };

    console.log("Template data prepared:", templateData);
    console.log("Calling Apps Script...");

    // Call Google Apps Script
    const response = await axios.post(APPS_SCRIPT_URL, templateData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000, // 30 second timeout
    });

    console.log("Apps Script response received");

    // Parse response
    const result = response.data;

    if (!result.success) {
      console.error("Apps Script error:", result.error);
      return res.status(500).json({
        error: "Failed to generate certificate",
        details: result.error
      });
    }

    // Validate PDF data
    if (!result.pdfUrl) {
      return res.status(500).json({
        error: "No PDF URL received from Apps Script"
      });
    }

    // Determine certificate version
    const latestCertificate = await Certificate.findOne({ membership: membership._id })
      .sort({ version: -1 })
      .lean();
    const version = latestCertificate ? latestCertificate.version + 1 : 1;

    // Persist certificate metadata
    await Certificate.create({
      user: req.user.id,
      membership: membership._id,
      membershipNo: membership.membershipNo,
      fileName: result.fileName || `${membership.membershipNo}_Certificate.pdf`,
      pdfUrl: result.pdfUrl,
      pdfId: result.pdfId,
      version,
    });

    console.log("Certificate metadata stored. Version:", version);
    console.log("=== Certificate link returned to client ===");

    res.json({
      success: true,
      pdfUrl: result.pdfUrl,
      fileName: result.fileName || `${membership.membershipNo}_Certificate.pdf`,
      pdfId: result.pdfId,
      version,
    });

  } catch (error) {
    console.error("Error generating certificate:", error.message);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: "Request timeout",
        details: "Certificate generation took too long. Please try again."
      });
    }
    
    if (error.response) {
      console.error("Apps Script error response:", error.response.data);
      return res.status(500).json({ 
        error: "Apps Script error", 
        details: error.response.data
      });
    }
    
    res.status(500).json({ 
      error: "Failed to generate certificate", 
      details: error.message
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "Certificate API running",
    appsScriptConfigured: true,
    appsScriptUrl: APPS_SCRIPT_URL
  });
});

export default router;