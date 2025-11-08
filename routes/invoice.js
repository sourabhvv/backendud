import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { auth, requireRole } from "../middleware/auth.js";
import User from "../models/User.js";
import Member from "../models/Member.js";
import { Invoice } from "../models/Invoice.js";

const router = Router();

const invoicesDir = path.join(process.cwd(), "uploads", "invoices");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    cb(null, invoicesDir);
  },
  filename: (req, file, cb) => {
    const sanitizedOriginal = file.originalname.replace(/\s+/g, "-");
    const timestamp = Date.now();
    cb(null, `${timestamp}-${sanitizedOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.membershipNo) {
      return res.status(404).json({
        success: false,
        message: "Membership number not found for the user"
      });
    }

    const invoices = await Invoice.find({ membershipNo: user.membershipNo })
      .sort({ issueDate: -1, createdAt: -1 });

    return res.json({ success: true, invoices });
  } catch (error) {
    console.error("Error fetching user invoices:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoices"
    });
  }
});

router.post(
  "/admin/:membershipNo",
  auth,
  requireRole("admin"),
  upload.single("invoice"),
  async (req, res) => {
    try {
      const { membershipNo } = req.params;
      const {
        invoiceNumber,
        packageName,
        description,
        amount,
        gstAmount,
        discount,
        totalAmount,
        issueDate,
        dueDate,
        status
      } = req.body;

      if (!membershipNo) {
        return res.status(400).json({ success: false, message: "membershipNo is required" });
      }

      if (!invoiceNumber || !packageName || !amount || !totalAmount) {
        return res.status(400).json({
          success: false,
          message: "invoiceNumber, packageName, amount and totalAmount are required"
        });
      }

      const member = await Member.findOne({ membershipNo });
      if (!member) {
        return res.status(404).json({ success: false, message: "Member not found" });
      }

      const payload = {
        invoiceNumber,
        member: member._id,
        membershipNo,
        packageName,
        description,
        amount: Number(amount),
        gstAmount: gstAmount ? Number(gstAmount) : 0,
        discount: discount ? Number(discount) : 0,
        totalAmount: Number(totalAmount),
        status: status || "pending"
      };

      if (Number.isNaN(payload.amount) || Number.isNaN(payload.totalAmount)) {
        return res.status(400).json({
          success: false,
          message: "amount and totalAmount must be valid numbers"
        });
      }

      if (Number.isNaN(payload.gstAmount) || Number.isNaN(payload.discount)) {
        return res.status(400).json({
          success: false,
          message: "gstAmount and discount must be valid numbers"
        });
      }

      if (issueDate) payload.issueDate = new Date(issueDate);
      if (dueDate) payload.dueDate = new Date(dueDate);
      if (req.file) payload.pdfUrl = `/api/uploads/invoices/${req.file.filename}`;

      const invoice = await Invoice.create(payload);

      return res.status(201).json({ success: true, invoice });
    } catch (error) {
      console.error("Error creating invoice:", error);
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Invoice number already exists"
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to create invoice"
      });
    }
  }
);

router.patch(
  "/admin/:invoiceId/pdf",
  auth,
  requireRole("admin"),
  upload.single("invoice"),
  async (req, res) => {
    try {
      const { invoiceId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No PDF file uploaded"
        });
      }

      const invoice = await Invoice.findById(invoiceId);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
      }

      if (invoice.pdfUrl) {
        const existingPath = invoice.pdfUrl.replace("/api/uploads", "uploads");
        const absoluteExistingPath = path.join(process.cwd(), existingPath);
        if (fs.existsSync(absoluteExistingPath)) {
          try {
            fs.unlinkSync(absoluteExistingPath);
          } catch (unlinkError) {
            console.warn("Failed to remove previous invoice PDF:", unlinkError);
          }
        }
      }

      invoice.pdfUrl = `/api/uploads/invoices/${req.file.filename}`;
      await invoice.save();

      return res.json({
        success: true,
        invoice
      });
    } catch (error) {
      console.error("Error updating invoice PDF:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update invoice PDF"
      });
    }
  }
);

export default router;

