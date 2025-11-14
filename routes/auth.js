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
    pass: "BE8ccNEn7cfUPx8JaTR+292pfzq1uPoU33fCCMEAB+6o",
  },
});

// ✅ Beautiful Email Template Function
const createOTPEmailTemplate = (name, otp, purpose = "verification") => {
  const getTitle = () => {
    switch (purpose) {
      case "password_reset": return "Password Reset - Udyami Connect";
      case "login": return "Login OTP - Udyami Connect";
      case "registration": return "Account Verification - Udyami Connect";
      default: return "OTP Verification - Udyami Connect";
    }
  };

  const getMainMessage = () => {
    switch (purpose) {
      case "password_reset": 
        return "You requested to reset your password for your Udyami Connect account.";
      case "login": 
        return "Thank you for using Udyami Connect.";
      case "registration": 
        return "Thank you for registering with Udyami Connect.";
      default: 
        return "Thank you for using Udyami Connect.";
    }
  };

  const getOTPDescription = () => {
    switch (purpose) {
      case "password_reset": 
        return "Please use the One-Time Password (OTP) below to reset your password:";
      case "login": 
        return "Please use the One-Time Password (OTP) below to complete your login:";
      case "registration": 
        return "Please use the One-Time Password (OTP) below to verify your account:";
      default: 
        return "Please use the One-Time Password (OTP) below to verify your account:";
    }
  };

  const getValidityTime = () => {
    switch (purpose) {
      case "password_reset": return "15 minutes";
      default: return "10 minutes";
    }
  };

  const getSecurityMessage = () => {
    switch (purpose) {
      case "password_reset": 
        return "If you did not request this password reset, please ignore this email and your password will remain unchanged.";
      case "login": 
        return "If you did not request this login, please ignore this email.";
      case "registration": 
        return "If you did not create an account, please ignore this email.";
      default: 
        return "If you did not request this verification, please ignore this email.";
    }
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${getTitle()}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f7fa;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
              
              <!-- Header with gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                    Udyami Connect
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #e9ecef; font-size: 14px; font-weight: 400;">
                    Empowering Entrepreneurs
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
                    Dear ${name},
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                    ${getMainMessage()}
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                    ${getOTPDescription()}
                  </p>

                  <!-- OTP Box -->
                  <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                    <tr>
                      <td align="center" style="padding: 30px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; border: 2px dashed #667eea;">
                        <div style="margin-bottom: 10px; color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                          🔐 Your OTP
                        </div>
                        <div style="font-size: 36px; font-weight: 700; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                          ${otp}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <div style="background-color: #fff5f5; border-left: 4px solid #fc8181; padding: 16px; margin: 0 0 30px 0; border-radius: 8px;">
                    <p style="margin: 0; color: #742a2a; font-size: 14px; line-height: 1.5;">
                      <strong>⏰ Valid for ${getValidityTime()}</strong><br>
                      Please do not share this code with anyone for your account's safety.
                    </p>
                  </div>

                  <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px; line-height: 1.6;">
                    ${getSecurityMessage()}
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 16px; font-weight: 600;">
                    Best regards,<br>
                    <span style="color: #667eea;">Team Udyami Connect</span>
                  </p>
                  
                  <div style="margin: 20px 0;">
                    <a href="http://www.udyamiconnect.com" style="display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-size: 14px;">
                      🌐 www.udyamiconnect.com
                    </a>
                  </div>
                  
                  <div style="margin: 10px 0;">
                    <a href="mailto:support@udyamiconnect.com" style="display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-size: 14px;">
                      📧 support@udyamiconnect.com
                    </a>
                  </div>

                  <p style="margin: 20px 0 0 0; color: #a0aec0; font-size: 12px;">
                    © 2025 Udyami Connect. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

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
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      userData: { email, password: hash, firstName, lastName, name: derivedName, role },
    });

    // Send OTP email with beautiful template
    await transporter.sendMail({
      from: '"Udyami Connect" <Info@udyamitahelpline.com>',
      to: email,
      subject: "Verify Your Account - Udyami Connect",
      html: createOTPEmailTemplate(derivedName || "User", otp, "registration"),
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
      { id: user._id, email: user.email, role: user.role, name: user.name },
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
    otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 min expiry

    // Send OTP to user's email with beautiful template
    await transporter.sendMail({
      from: '"Udyami Connect" <Info@udyamitahelpline.com>',
      to: email,
      subject: "Your Login OTP - Udyami Connect",
      html: createOTPEmailTemplate(user.name || "User", otp, "login"),
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
      { id: user._id, email: user.email, role: user.role, name: user.name },
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
/* ✅ FORGOT PASSWORD — Send Reset OTP                                         */
/* -------------------------------------------------------------------------- */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: "If an account with this email exists, a password reset OTP has been sent" });
    }

    // Generate reset OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(`reset_${email}`, { 
      otp, 
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes for password reset
      type: 'password_reset'
    });

    // Send reset OTP email
    await transporter.sendMail({
      from: '"Udyami Connect" <Info@udyamitahelpline.com>',
      to: email,
      subject: "Reset Your Password - Udyami Connect",
      html: createOTPEmailTemplate(user.name || "User", otp, "password_reset"),
    });

    res.json({ message: "If an account with this email exists, a password reset OTP has been sent" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Password reset request failed", error: e.message });
  }
});

/* -------------------------------------------------------------------------- */
/* ✅ RESET PASSWORD — Verify OTP & Update Password                            */
/* -------------------------------------------------------------------------- */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const record = otpStore.get(`reset_${email}`);
    
    if (!record) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(`reset_${email}`);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.type !== 'password_reset') {
      return res.status(400).json({ message: "Invalid OTP type" });
    }

    // Verify user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    // Clean up OTP
    otpStore.delete(`reset_${email}`);

    res.json({ message: "Password reset successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Password reset failed", error: e.message });
  }
});

export default router;