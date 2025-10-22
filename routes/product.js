import { Router } from "express";
import multer from "multer";
import Product from "../models/Product.js";
import Organization from "../models/Organization.js";
import { auth, requireActiveMembership, requireRole } from "../middleware/auth.js"; // requireAdmin middleware

const router = Router();

// configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// -------------------- USER APIs -------------------- //

// GET all products for an org
router.get("/", auth, requireActiveMembership, async (req, res) => {
  const org = await Organization.findOne({ owner: req.user.id });
  const list = await Product.find({ org: org?._id });
  res.json(list);
});

// POST new product with a single image
router.post("/", auth, requireActiveMembership, upload.single("image"), async (req, res) => {
  try {
    const org = await Organization.findOne({ owner: req.user.id });
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const item = await Product.create({
      org: org._id,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      price: req.body.price,
      url: req.body.url,
      image: imagePath,
      status: "pending", // 👈 default status
    });

    res.json(item);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// DELETE product
router.delete("/:id", auth, requireActiveMembership, async (req, res) => {
  await Product.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

// -------------------- ADMIN APIs -------------------- //

// GET all products (admin) with optional search by name or category
router.get("/admin/all", auth, requireRole("admin"), async (req, res) => {
  const { search } = req.query;
  let query = {};

  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ],
    };
  }

  const products = await Product.find(query).populate("org", "name");
  res.json(products);
});

// APPROVE product
router.patch("/admin/approve/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    res.json(product);
  } catch (error) {
    console.error("Error approving product:", error);
    res.status(500).json({ error: "Failed to approve product" });
  }
});

// REJECT product
router.patch("/admin/reject/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    res.json(product);
  } catch (error) {
    console.error("Error rejecting product:", error);
    res.status(500).json({ error: "Failed to reject product" });
  }
});

export default router;
