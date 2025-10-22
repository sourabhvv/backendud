import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = Router();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "f04b7f83a31a0f214b56c3d4b8f1a5e1c8722a2c0b52b43ff1e97a7a82a0d91e8a23b98afae34e5";

// In-memory OTP store
const otpStore = new Map();

// ✅ AWS SES SMTP config
const transporter = nodemailer.createTransport({
  host: "email-smtp.us-east-1.amazonaws.com",
  port: 587,
  secure: false,
  auth: {
    user: "AKIASBGQLFXSX56LTMCA",
    pass: "BE8ccNEn7cfUPx8JaTR+292pfzq1uPoU33fCCMEAB+6o", // Replace safely
  },
});

/* -------------------------------------------------------------------------- */
/* ✅ STEP 1: REGISTER — Send OTP                                             */
/* -------------------------------------------------------------------------- */
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, name } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const role = "user";
    const derivedName = name && name.trim() ? name.trim() : `${firstName} ${lastName}`.trim();

    // Generate and store OTP with user data temporarily
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
      userData: { email, password: hash, firstName, lastName, name: derivedName, role },
    });

    // Send OTP email
    await transporter.sendMail({
      from: '"Account Verification" <Info@udyamitahelpline.com>',
      to: email,
      subject: "Verify your Email - Udyamita",
      html: `
        <h2>Welcome to Udyamita!</h2>
        <p>Use the following OTP to verify your email and complete registration:</p>
        <h3>${otp}</h3>
        <p>This OTP expires in 5 minutes.</p>
      `,
    });

    res.json({ message: "OTP sent to your email for verification" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Registration failed", error: e.message });
  }
});

/* -------------------------------------------------------------------------- */
/* ✅ STEP 2: REGISTER — Verify OTP & Create Account                          */
/* -------------------------------------------------------------------------- */
router.post("/verify-register-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ message: "OTP not found or expired" });

    if (Date.now() > record.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    // OTP verified → Create user
    const user = await User.create(record.userData);
    otpStore.delete(email);

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    res.status(500).json({ message: "OTP verification failed", error: e.message });
  }
});

/* -------------------------------------------------------------------------- */
/* ✅ STEP 3: LOGIN — Email + Password → Send OTP                             */
/* -------------------------------------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "The email or password you entered is incorrect. If you don't have an account, please sign up" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    // Generate login OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 min expiry

    // Send OTP to user’s email
    await transporter.sendMail({
      from: '"Login Verification" <Info@udyamitahelpline.com>',
      to: email,
      subject: "Your Login OTP - Udyamita",
      html: `
        <h2>Login Verification</h2>
        <p>Use this OTP to complete your login:</p>
        <h3>${otp}</h3>
        <p>This OTP expires in 5 minutes.</p>
      `,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Login failed", error: e.message });
  }
});

/* -------------------------------------------------------------------------- */
/* ✅ STEP 4: LOGIN — Verify OTP → Issue JWT Token                            */
/* -------------------------------------------------------------------------- */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ message: "OTP not found or expired" });

    if (Date.now() > record.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    otpStore.delete(email);

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    res.status(500).json({ message: "OTP verification failed", error: e.message });
  }
});

export default router;
