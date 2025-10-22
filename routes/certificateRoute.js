import express from "express";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Organization from "../models/Organization.js";
import MemberShip from "../models/MemberShip.js";
import { auth } from '../middleware/auth.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Output folder
const outputDir = path.join(__dirname, "outputcertificate");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Helper function to format period
function formatPeriod(joinDate, expireDate) {
  const options = { month: "short", year: "numeric" };
  const joinStr = new Date(joinDate).toLocaleDateString("en-US", options);
  const expireStr = new Date(expireDate).toLocaleDateString("en-US", options);
  return `${joinStr} - ${expireStr}`;
}

// Endpoint: generate certificate and download DOCX
router.get("/download", auth, async (req, res) => {
  try {
    // Fetch organization based on logged-in user
    const org = await Organization.findOne({ owner: req.user.id });

    console.log(org)
    if (!org) {
      return res.status(400).json({ error: "No organization profile found" });
    }



    // Fetch membership linked to the org
    const membership = await MemberShip.findOne({ membershipNo: org.membershipNo });

    console.log(membership)
    if (!membership) {
      return res.status(400).json({ error: "Membership not found" });
    }

    // Format period
    const period = formatPeriod(membership.JoinDate, membership.ExpireDate);

    const templatePath = path.join(__dirname, "Template.docx");
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        error: "Template file not found. Place Template.docx in the same folder as this route file",
      });
    }

    const templateContent = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(templateContent);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    // Set data for DOCX
    doc.setData({
      "Customer Name": org.entityName,
      Period: period,
      Date: new Date().toLocaleDateString("en-GB"), // Today's date
      Member: membership.membershipNo,
    });

    doc.render();

    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    const fileName = `${membership.membershipNo}_Certificate.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Error generating certificate:", error);
    res.status(500).json({ error: "Failed to generate certificate", details: error.message });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "API running", template: path.join(__dirname, "Template.docx"), outputDir });
});

export default router;
