
// import express from 'express';
// import cors from 'cors';
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// import cookieParser from 'cookie-parser';
// import { createServer } from 'http';
// import { Server as SocketIOServer } from 'socket.io';
// import jwt from 'jsonwebtoken';
// import path from "path";
// // Your existing imports...
// import authRoutes from './routes/auth.js';
// import orgRoutes from './routes/org.js';
// import productRoutes from './routes/product.js';
// import serviceRoutes from './routes/service.js';
// import connectRoutes from './routes/connect.js';
// import chatRoutes from './routes/chat.js';
// import planRoutes from './routes/plan.js';
// import adminRoute from  './routes/adminRoute.js';
// import adminMember from "./routes/adminMember.js"
// dotenv.config();

// const app = express();
// const httpServer = createServer(app);

// // Enhanced Socket.io setup
// const io = new SocketIOServer(httpServer, {
//   cors: { origin: process.env.CLIENT_URL, credentials: true }
// });

// app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// const onlineUsers = new Map();

// // Socket.io connection handling
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   // Handle user going online
//   socket.on('online', (orgId) => {
//     onlineUsers.set(orgId, socket.id);
//     console.log(`Organization ${orgId} is online`);
    
//     // Broadcast to all connected users that this user is online
//     socket.broadcast.emit('user-online', orgId);
//   });

//   // Handle sending messages
//   socket.on('send-message', ({ from, to, text }) => {
//     const recipientSocketId = onlineUsers.get(to);
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit('receive-message', {
//         from,
//         to,
//         text,
//         createdAt: new Date().toISOString()
//       });
//       console.log(`Message sent from ${from} to ${to}: ${text}`);
//     }
//   });

//   // Handle connection requests (add this for real-time connection updates)
//   socket.on('connection-request', ({ fromOrg, toOrg, connectionData }) => {
//     const recipientSocketId = onlineUsers.get(toOrg);
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit('new-connection-request', connectionData);
//     }
//   });

//   // Handle connection responses
//   socket.on('connection-response', ({ fromOrg, toOrg, connectionData }) => {
//     const senderSocketId = onlineUsers.get(fromOrg);
//     if (senderSocketId) {
//       io.to(senderSocketId).emit('connection-update', connectionData);
//     }
//   });

//   // Handle typing indicators (optional)
//   socket.on('typing', ({ from, to, isTyping }) => {
//     const recipientSocketId = onlineUsers.get(to);
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit('user-typing', { from, isTyping });
//     }
//   });

//   // Handle disconnect
//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//     // Remove user from online users
//     for (const [orgId, socketId] of onlineUsers.entries()) {
//       if (socketId === socket.id) {
//         onlineUsers.delete(orgId);
//         socket.broadcast.emit('user-offline', orgId);
//         console.log(`Organization ${orgId} went offline`);
//         break;
//       }
//     }
//   });
// });

// // Make io available to routes
// app.set('io', io);

// // Your existing middleware
// app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
// app.use(express.json({ limit: '2mb' }));
// app.use(cookieParser());

// // Your existing routes
// app.use('/api/auth', authRoutes);
// app.use('/api/org', orgRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/services', serviceRoutes);
// app.use('/api/connect', connectRoutes);
// app.use('/api/chat', chatRoutes);
// app.use('/api/plans', planRoutes);

// // admin

// app.use('/api/adminRoutes', adminRoute);
// app.use('/api/admin', adminMember);



// // Connect to MongoDB and start server
// const PORT = process.env.PORT || 5000;
// mongoose.connect(process.env.MONGO_URI).then(() => {
//   console.log('MongoDB connected');
//   httpServer.listen(PORT, () => console.log('Server listening on', PORT));
// }).catch(err => console.error(err));

// // Export io for use in routes
// export default app;

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

dotenv.config();

const app = express();

// Middleware setup
const allowedOrigins = [
  "https://udyamitya-plateform.vercel.app",
  "https://udyamitya-plateform-qmif.vercel.app",
  "https://www.udyamiconnect.com",
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
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Do not throw; disable CORS for unrecognized origins without failing the request
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
