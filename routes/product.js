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
  const { search, status, category, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
  let query = {};

  // Search filter
  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    };
  }

  // Status filter - handle both products with and without status field
  if (status && status !== 'all') {
    if (status === 'pending') {
      query.$or = [
        { status: 'pending' },
        { status: { $exists: false } } // Include products without status field as pending
      ];
    } else {
      query.status = status;
    }
  }

  // Category filter
  if (category && category !== 'all') {
    query.category = category;
  }

  // Date range filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) {
      query.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      query.createdAt.$lte = new Date(dateTo);
    }
  }

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find(query)
      .populate("org", "name entityName companyName website phone officeAddress state country category gstNumber turnover")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add default status for products that don't have one
    const productsWithStatus = products.map(product => ({
      ...product.toObject(),
      status: product.status || 'pending'
    }));

    const total = await Product.countDocuments(query);
    
    res.json({
      products: productsWithStatus,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
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

// GET available categories for filter dropdown
router.get("/admin/categories", auth, requireRole("admin"), async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// MIGRATION: Update existing products without status to have 'pending' status
router.post("/admin/migrate-status", auth, requireRole("admin"), async (req, res) => {
  try {
    const result = await Product.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'pending' } }
    );
    res.json({ 
      message: `Updated ${result.modifiedCount} products with pending status`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error migrating product status:", error);
    res.status(500).json({ error: "Failed to migrate product status" });
  }
});

// TEST ROUTE: Get all products without authentication (for debugging)
router.get("/test/all", async (req, res) => {
  try {
    const products = await Product.find({})
      .populate("org", "name entityName companyName website phone officeAddress state country category gstNumber turnover")
      .sort({ createdAt: -1 })
      .limit(10);

    // Add default status for products that don't have one
    const productsWithStatus = products.map(product => ({
      ...product.toObject(),
      status: product.status || 'pending'
    }));

    res.json({
      products: productsWithStatus,
      total: productsWithStatus.length
    });
  } catch (error) {
    console.error("Error fetching test products:", error);
    res.status(500).json({ error: "Failed to fetch test products" });
  }
});

export default router;
