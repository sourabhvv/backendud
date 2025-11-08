
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";

// Import your routes
import authRoutes from "./routes/auth.js";
import orgRoutes from "./routes/org.js";
import productRoutes from "./routes/product.js";
import serviceRoutes from "./routes/service.js";
import connectRoutes from "./routes/connect.js";
import chatRoutes from "./routes/chat.js";
import planRoutes from "./routes/plan.js";
import adminRoute from "./routes/adminRoute.js";
import adminMember from "./routes/adminMember.js";
import userRoutes from "./routes/user.js";
import membershipRoutes from "./routes/membership.js";

import pricingRoute from "./routes/pricingRoute.js";
import certificateRoute from "./routes/certificateRoute.js";
import businessRoute from "./routes/business.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://udyamitya-plateform.vercel.app",
  "https://udyamitya-plateform-qmif.vercel.app",
  "https://www.udyamiconnect.com",
  "https://www.udyamiconnect.com/",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://secure.payu.in",
  "https://test.payu.in"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.log(`CORS not enabled for origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/org", orgRoutes);
app.use("/api/products", productRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/connect", connectRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/adminRoutes", adminRoute);
app.use("/api/admin", adminMember);
app.use("/api/user", userRoutes);
app.use("/api/membership", membershipRoutes);

app.use("/api/pricing",pricingRoute);
app.use("/api/certificate",certificateRoute);
app.use("/api/businesses", businessRoute);

// General health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// MongoDB connection (only if not already connected)
if (mongoose.connection.readyState === 0) {
  mongoose
    .connect(process.env.MONGO_URI || "mongodb://localhost:27017/b2bplatform")
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

// Start server if not in Vercel environment
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// ✅ Export the Express app (Vercel requires this)
export default app;
