// import { Router } from 'express';
// import crypto from 'crypto';
// import Organization from '../models/Organization.js';
// import { auth } from '../middleware/auth.js';
// import Member from '../models/Member.js';
// import { Invoice } from '../models/Invoice.js';

// const router = Router();

// // PayU Credentials (sandbox)
// const PAYU_KEY = 'QhBkAJ';
// const PAYU_SALT = 'sZqGSGOCOc3HBe4CH2PVPYKDcsiBIcYq';
// const PAYU_BASE_URL = ' https://secure.payu.in/_payment';

// // https://test.payu.in/_payment"

// // Simple 60s per-user cooldown to avoid Too Many Requests
// const payuCooldownMap = new Map();

// // Initiate payment
// router.post('/payu', auth, async (req, res) => {
//   try {
//     // Guard: ensure real credentials are configured
//     if (!process.env.PAYU_KEY || !process.env.PAYU_SALT || PAYU_KEY === 'your_key' || PAYU_SALT === 'your_salt') {
//       return res.status(500).json({
//         message: 'PayU credentials not configured. Set PAYU_KEY and PAYU_SALT in environment.'
//       });
//     }
//     const now = Date.now();
//     const nextAllowedAt = payuCooldownMap.get(req.user.id) || 0;
//     if (now < nextAllowedAt) {
//       const retryAfterSec = Math.ceil((nextAllowedAt - now) / 1000);
//       res.set('Retry-After', String(retryAfterSec));
//       return res.status(429).json({ message: 'Too many requests. Please try again later.', retryAfter: retryAfterSec });
//     }
//     const { plan, name, email, phone } = req.body;

//     // Find org
//     const org = await Organization.findOne({ owner: req.user.id });
//     if (!org) return res.status(400).json({ message: 'Create org profile first' });

//     // Save plan locally
//     org.plan = plan;
//     await org.save();

//     // PayU required fields
//     const txnid = "Txn_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
//     const productinfo = plan === 'annual' ? 'Annual Subscription' : 'Lifetime Subscription';
//     const firstname = name;
//     const baseUrl = process.env.SERVER_PUBLIC_URL || 'http://localhost:5000';
//     const surl = `${baseUrl}/api/plans/success`;
//     const furl = `${baseUrl}/api/plans/failure`;
//     const amount = plan === 'annual' ? '1.00' : '2.00';

//     // Generate hash (include udf1..udf3, leave udf4..udf10 empty)
//     const hashString = `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${req.user.id}|${org._id.toString()}|${plan}|||||||||${PAYU_SALT}`;
//     const hash = crypto.createHash('sha512').update(hashString).digest('hex');

//     // Include udf fields to identify user/org on callback
//     const udf1 = req.user.id; // user id
//     const udf2 = org._id.toString(); // org id
//     const udf3 = plan; // plan for redundancy

//     // set next allowed time after issuing a transaction
//     payuCooldownMap.set(req.user.id, now + 60 * 1000);

//     res.json({
//       paymentUrl: PAYU_BASE_URL,
//       key: PAYU_KEY,
//       txnid,
//       amount,
//       productinfo,
//       firstname,
//       email,
//       phone,
//       surl,
//       furl,
//       hash,
//       udf1,
//       udf2,
//       udf3,
//       service_provider: 'payu_paisa'
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Payment initiation failed' });
//   }
// });

// // Success callback
// router.post('/success', async (req, res) => {
//   try {
//     const { mihpayid, status, txnid, amount, email, productinfo, udf1, udf2, udf3, mode, hash, key } = req.body;
//     console.log('Payment Success:', req.body);

//     // Basic success check
//     if (status !== 'success') {
//       return res.status(400).send('Payment not successful');
//     }

//     // Verify PayU response hash
//     // hashSequence: SALT|status|||||||||udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
//     const reverseHashString = `${PAYU_SALT}|${status}|||||||||${udf3 || ''}|${udf2 || ''}|${udf1 || ''}|${email || ''}|${req.body.firstname || ''}|${productinfo || ''}|${amount || ''}|${txnid || ''}|${key || PAYU_KEY}`;
//     const calculated = crypto.createHash('sha512').update(reverseHashString).digest('hex');
//     if (hash && calculated !== hash) {
//       return res.status(400).send('Invalid hash from PayU');
//     }

//     // Lookup org via udf2 (org id) or fallback via email
//     let org = null;
//     if (udf2) {
//       org = await Organization.findById(udf2);
//     }
//     if (!org && email) {
//       org = await Organization.findOne({ email });
//     }
//     if (!org) {
//       return res.status(404).send('Organization not found for payment');
//     }

//     // Ensure a member exists (create if missing)
//     const generatedMembershipNo = org.membershipNo || `MBR-${Date.now()}`;
//     if (!org.membershipNo) {
//       org.membershipNo = generatedMembershipNo;
//       await org.save();
//     }

//     let member = await Member.findOne({ membershipNo: generatedMembershipNo });
//     if (!member) {
//       member = await Member.create({
//         membershipNo: generatedMembershipNo,
//         membershipCompany: org.name || 'Organization Member',
//         gstStatus: 'Unregistered'
//       });
//     }

//     // Create invoice with initial payment captured
//     const baseAmount = Number(amount) || 0;
//     const gstAmount = 0;
//     const discount = 0;
//     const totalAmount = baseAmount + gstAmount - discount;

//     const invoice = await Invoice.create({
//       invoiceNumber: `INV-${new Date().getFullYear()}-${Date.now()}`,
//       member: member._id,
//       membershipNo: member.membershipNo,
//       packageName: productinfo || (udf3 === 'annual' ? 'Annual Subscription' : 'Lifetime Subscription'),
//       description: 'Subscription purchase via PayU',
//       amount: baseAmount,
//       gstAmount,
//       discount,
//       totalAmount,
//       payments: [{
//         paymentId: mihpayid,
//         amount: baseAmount,
//         membershipNo: member.membershipNo,
//         source: (mode || 'netbanking').toLowerCase(),
//         status: 'success'
//       }],
//       status: 'paid'
//     });

//     res.send('Payment Successful! Invoice generated. You can close this window.');
//   } catch (err) {
//     res.status(500).send('Error in payment success');
//   }
// });

// // Failure callback
// router.post('/failure', async (req, res) => {
//   try {
//     const { status, hash, key, txnid, amount, email, productinfo, udf1, udf2, udf3 } = req.body;
//     // Verify failure payload as well (status should be 'failure' or similar)
//     const reverseHashString = `${PAYU_SALT}|${status}|||||||||${udf3 || ''}|${udf2 || ''}|${udf1 || ''}|${email || ''}|${req.body.firstname || ''}|${productinfo || ''}|${amount || ''}|${txnid || ''}|${key || PAYU_KEY}`;
//     const calculated = crypto.createHash('sha512').update(reverseHashString).digest('hex');
//     if (hash && calculated !== hash) {
//       return res.status(400).send('Invalid hash from PayU');
//     }
//     console.log('Payment Failed:', req.body);
//     res.send('Payment Failed! You can try again.');
//   } catch (err) {
//     res.status(500).send('Error in payment failure');
//   }
// });

// export default router;


import { Router } from "express";
import crypto from "crypto";
import Organization from "../models/Organization.js";
import { auth } from "../middleware/auth.js";
import Member from "../models/Member.js";
import { Invoice } from "../models/Invoice.js";
import Membership from "../models/MemberShip.js";

const router = Router();

// ✅ PayU Production Credentials
const PAYU_KEY = "QhBkAJ";
const PAYU_SALT = "sZqGSGOCOc3HBe4CH2PVPYKDcsiBIcYq";
const PAYU_BASE_URL = "https://secure.payu.in/_payment";

// Simple cooldown (60s per user)
const payuCooldownMap = new Map();

// -----------------------------
// 🚀 Initiate Payment
// -----------------------------
router.post("/payu", auth, async (req, res) => {
  try {
    if (!PAYU_KEY || !PAYU_SALT || PAYU_KEY === "your_live_key") {
      return res.status(500).json({
        message:
          "PayU credentials not configured. Set PAYU_KEY and PAYU_SALT in environment.",
      });
    }

    const now = Date.now();
    const nextAllowedAt = payuCooldownMap.get(req.user.id) || 0;
    if (now < nextAllowedAt) {
      const retryAfterSec = Math.ceil((nextAllowedAt - now) / 1000);
      res.set("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: retryAfterSec,
      });
    }

    const { plan, name, email, phone } = req.body;

    // Find organization
    const org = await Organization.findOne({ owner: req.user.id });
    if (!org) return res.status(400).json({ message: "Create org profile first" });

    org.plan = plan;
    await org.save();

    // PayU parameters
    const txnid = "Txn_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const productinfo =
      plan === "annual" ? "Annual Subscription" : "Lifetime Subscription";
    const firstname = name;
    const baseUrl = process.env.SERVER_PUBLIC_URL || "http://localhost:5000";
    const surl = `${baseUrl}/api/plans/success`;
    const furl = `${baseUrl}/api/plans/failure`;
    // Pricing: annual 4999, lifetime 49999 + 18% GST
    const annualAmount = 1;
    const lifetimeBase = 2;
    const lifetimeGst = Math.round(lifetimeBase * 0.18);
    const lifetimeTotal = lifetimeBase + lifetimeGst;
    const amount = (plan === "annual" ? annualAmount : lifetimeTotal).toFixed(2);

    // udf fields
    const udf1 = req.user.id; // user id
    const udf2 = org._id.toString(); // org id
    const udf3 = plan; // plan name
    const udf4 = "";
    const udf5 = "";
    const udf6 = "";
    const udf7 = "";
    const udf8 = "";
    const udf9 = "";
    const udf10 = "";

    // ✅ Correct PayU hash sequence
    const hashString = `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|${udf6}|${udf7}|${udf8}|${udf9}|${udf10}|${PAYU_SALT}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    // Set cooldown
    payuCooldownMap.set(req.user.id, now + 60 * 1000);

    // Send PayU payment details to frontend
    res.json({
      paymentUrl: PAYU_BASE_URL,
      key: PAYU_KEY,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      hash,
      udf1,
      udf2,
      udf3,
      service_provider: "payu_paisa",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Payment initiation failed" });
  }
});

// -----------------------------
// ✅ Success Callback
// -----------------------------
router.post("/success", async (req, res) => {
  try {
    const {
      mihpayid,
      status,
      txnid,
      amount,
      email,
      productinfo,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      udf6,
      udf7,
      udf8,
      udf9,
      udf10,
      mode,
      hash,
      key,
      firstname,
    } = req.body;

    console.log("Payment Success:", req.body);

    if (status !== "success") {
      return res.status(400).send("Payment not successful");
    }

    // ✅ Reverse hash verification
    const reverseHashString = `${PAYU_SALT}|${status}|${udf10 || ""}|${udf9 || ""}|${udf8 || ""}|${udf7 || ""}|${udf6 || ""}|${udf5 || ""}|${udf4 || ""}|${udf3 || ""}|${udf2 || ""}|${udf1 || ""}|${email || ""}|${firstname || ""}|${productinfo || ""}|${amount || ""}|${txnid || ""}|${key || PAYU_KEY}`;
    const calculated = crypto.createHash("sha512").update(reverseHashString).digest("hex");

    if (hash && calculated !== hash) {
      console.log("Expected:", calculated);
      console.log("Received:", hash);
      return res.status(400).send("Invalid hash from PayU");
    }

    // Fetch organization
    let org = udf2 ? await Organization.findById(udf2) : null;
    if (!org && email) org = await Organization.findOne({ email });
    if (!org) return res.status(404).send("Organization not found for payment");

    // Ensure a member exists
    const membershipNo = org.membershipNo || `MBR-${Date.now()}`;
    if (!org.membershipNo) {
      org.membershipNo = membershipNo;
      await org.save();
    }

    let member = await Member.findOne({ membershipNo });
    if (!member) {
      member = await Member.create({
        membershipNo,
        membershipCompany: org.name || "Organization Member",
        gstStatus: "Unregistered",
      });
    }

    // Create or update Membership record on successful payment
    const nowDate = new Date();
    let expireDate = null;
    if ((udf3 || "").toLowerCase() === "annual") {
      expireDate = new Date(nowDate);
      expireDate.setFullYear(expireDate.getFullYear() + 1);
    } else if ((udf3 || "").toLowerCase() === "lifetime") {
      // choose a far future date to represent lifetime
      expireDate = new Date(nowDate);
      expireDate.setFullYear(expireDate.getFullYear() + 50);
    }

    const existingMembership = await Membership.findOne({ membershipNo });
    if (existingMembership) {
      existingMembership.membershipStatus = "active";
      existingMembership.JoinDate = nowDate;
      existingMembership.ExpireDate = expireDate;
      existingMembership.packageName = productinfo || (udf3 || "");
      await existingMembership.save();
    } else {
      await Membership.create({
        membershipNo,
        membershipStatus: "active",
        JoinDate: nowDate,
        ExpireDate: expireDate,
        packageName: productinfo || (udf3 || ""),
      });
    }

    // Create invoice
    const baseAmount = Number(amount) || 0;
    const totalAmount = baseAmount;

    await Invoice.create({
      invoiceNumber: `INV-${new Date().getFullYear()}-${Date.now()}`,
      member: member._id,
      membershipNo: member.membershipNo,
      packageName:
        productinfo || (udf3 === "annual" ? "Annual Subscription" : "Lifetime Subscription"),
      description: "Subscription purchase via PayU",
      amount: baseAmount,
      totalAmount,
      payments: [
        {
          paymentId: mihpayid,
          amount: baseAmount,
          membershipNo: member.membershipNo,
          source: (mode || "netbanking").toLowerCase(),
          status: "success",
        },
      ],
      status: "paid",
    });

    // Set CORS headers for success callback page rendering in browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.send("✅ Payment Successful! Invoice generated.");
  } catch (err) {
    console.error("Success callback error:", err);
    res.status(500).send("Error in payment success");
  }
});

// -----------------------------
// ❌ Failure Callback
// -----------------------------
router.post("/failure", async (req, res) => {
  try {
    const {
      status,
      hash,
      key,
      txnid,
      amount,
      email,
      productinfo,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      udf6,
      udf7,
      udf8,
      udf9,
      udf10,
      firstname,
    } = req.body;

    const reverseHashString = `${PAYU_SALT}|${status}|${udf10 || ""}|${udf9 || ""}|${udf8 || ""}|${udf7 || ""}|${udf6 || ""}|${udf5 || ""}|${udf4 || ""}|${udf3 || ""}|${udf2 || ""}|${udf1 || ""}|${email || ""}|${firstname || ""}|${productinfo || ""}|${amount || ""}|${txnid || ""}|${key || PAYU_KEY}`;
    const calculated = crypto.createHash("sha512").update(reverseHashString).digest("hex");

    if (hash && calculated !== hash) {
      return res.status(400).send("Invalid hash from PayU");
    }

    console.log("Payment Failed:", req.body);
    // Set CORS headers for failure callback page rendering
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.send("❌ Payment Failed! You can try again.");
  } catch (err) {
    console.error("Failure callback error:", err);
    res.status(500).send("Error in payment failure");
  }
});

export default router;

