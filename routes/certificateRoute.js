import express from "express";
import axios from "axios";
import Organization from "../models/Organization.js";
import MemberShip from "../models/MemberShip.js";
import User from "../models/User.js";
import Certificate from "../models/Certificate.js";
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Certificate Service URL - matches frontend
const CERTIFICATE_SERVICE_URL = process.env.CERTIFICATE_SERVICE_URL || "https://script.google.com/macros/s/AKfycbxCus8XSoyejrehqGiJKVrcjq8V_Ote8T9bZOiYGoAmRbDVnsCbn290Kh9EjkZbhWNMWg/exec";

// Helper function to format membership period - matches frontend logic
function formatMembershipPeriod(joinDate, expireDate) {
  if (!joinDate || !expireDate) return null;

  const join = new Date(joinDate);
  const expire = new Date(expireDate);

  if (isNaN(join.getTime()) || isNaN(expire.getTime())) {
    return null;
  }

  const options = { month: "short", year: "numeric" };
  return `${join.toLocaleDateString("en-US", options)} - ${expire.toLocaleDateString("en-US", options)}`;
}

// Endpoint: generate certificate and return PDF URL
router.get("/download", auth, async (req, res) => {
  try {
    console.log("=== Certificate Generation Started ===");
    console.log("User ID:", req.user?.id);

    // Fetch organization based on logged-in user
    const org = await Organization.findOne({ owner: req.user.id });
    
    if (!org) {
      return res.status(404).json({ 
        success: false,
        error: "Organization profile not found."
      });
    }

    // Fetch membership - try from org.membershipNo first, then from user
    let membership = null;
    // Fetch user to get membershipNo if needed
    const userProfile = await User.findById(req.user.id);
    const membershipNo = org.membershipNo || userProfile?.membershipNo;

    if (!membershipNo) {
      return res.status(400).json({ 
        success: false,
        error: "Membership number not available."
      });
    }

    // Try to find membership by membershipNo
    membership = await MemberShip.findOne({ membershipNo });

    if (!membership) {
      return res.status(404).json({ 
        success: false,
        error: "Membership not found."
      });
    }

    // Validate membership dates
    if (!membership.JoinDate || !membership.ExpireDate) {
      return res.status(400).json({ 
        success: false,
        error: "Membership period is incomplete. Please contact support."
      });
    }

    // Format membership period
    const period = formatMembershipPeriod(membership.JoinDate, membership.ExpireDate);

    if (!period) {
      return res.status(400).json({ 
        success: false,
        error: "Unable to format membership period."
      });
    }

    // Prepare payload - matches frontend logic exactly
    const payload = {
      customerName: org.entityName || org.name || userProfile?.name || "Member",
      period,
      date: new Date().toLocaleDateString("en-GB"),
      membershipNo: org.membershipNo || membership.membershipNo,
    };

    console.log("Certificate payload prepared:", JSON.stringify(payload, null, 2));
    console.log("Calling Certificate Service at:", CERTIFICATE_SERVICE_URL);

    // Call Certificate Service with timeout
    const response = await axios.post(CERTIFICATE_SERVICE_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000, // 30 second timeout
    });

    console.log("Certificate service response status:", response.status);
    console.log("Certificate service response data:", JSON.stringify(response.data, null, 2));

    // Check if response status is not OK
    if (response.status < 200 || response.status >= 300) {
      console.error("Certificate service returned non-OK status:", response.status);
      return res.status(response.status).json({
        success: false,
        error: `Certificate service responded with status ${response.status}`,
        responseData: response.data
      });
    }

    const result = response.data || {};
    const { pdfUrl, fileName, success, error } = result;

    if (!success) {
      console.error("Certificate service returned success: false", { error, result });
      return res.status(500).json({
        success: false,
        error: error || "Certificate generation failed.",
        details: result
      });
    }

    if (!pdfUrl) {
      return res.status(500).json({
        success: false,
        error: "Certificate link not available."
      });
    }

    // Store certificate metadata if Certificate model is available
    try {
      const latestCertificate = await Certificate.findOne({ membership: membership._id })
        .sort({ version: -1 })
        .lean();
      const version = latestCertificate ? latestCertificate.version + 1 : 1;

      await Certificate.create({
        user: req.user.id,
        membership: membership._id,
        membershipNo: membership.membershipNo,
        fileName: fileName || `${membership.membershipNo}_Certificate.pdf`,
        pdfUrl: pdfUrl,
        pdfId: result.pdfId,
        version,
      });

      console.log("Certificate metadata stored. Version:", version);
    } catch (certError) {
      console.warn("Failed to store certificate metadata:", certError.message);
      // Continue even if metadata storage fails
    }

    console.log("=== Certificate link generated successfully ===");

    // Return response matching frontend expectations
    return res.json({
      success: true,
      pdfUrl,
      fileName: fileName || `${membership.membershipNo}_Certificate.pdf`,
      pdfId: result.pdfId,
      version: result.version,
    });

  } catch (error) {
    console.error("Error generating certificate:", error.message);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      hasRequest: !!error.request
    });
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: "Certificate generation is taking longer than expected. Please try again."
      });
    }
    
    // Handle axios response errors
    if (error.response) {
      console.error("Certificate service error response:", JSON.stringify(error.response.data, null, 2));
      const errorData = error.response.data || {};
      
      return res.status(error.response.status || 500).json({ 
        success: false,
        error: errorData.error || "Unable to retrieve certificate. Please check your membership status.",
        details: errorData,
        statusCode: error.response.status
      });
    }
    
    // Handle network errors
    if (error.request) {
      console.error("No response received from certificate service. Request:", error.request);
      return res.status(503).json({
        success: false,
        error: "Unable to connect to certificate service. Please check the certificate service URL configuration."
      });
    }
    
    // Handle other errors
    return res.status(500).json({ 
      success: false,
      error: "Unable to retrieve certificate. Please check your membership status.",
      details: error.message,
      errorCode: error.code
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "Certificate API running",
    certificateServiceConfigured: true,
    certificateServiceUrl: CERTIFICATE_SERVICE_URL
  });
});

export default router;