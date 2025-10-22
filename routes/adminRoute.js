import { Router } from 'express';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Member from '../models/Member.js';
import Organization from '../models/Organization.js';
import PackageTaken from '../models/PackageTakenSchema.js';
import { PaymentDetails } from '../models/PaymentDetailsSchema.js';
import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import StageData from '../models/StageData.js';

const router = Router();

async function insertBatch(users, orgs, members, packages, payments, invoices) {
  for (const u of users) {
    await User.findOneAndUpdate({ email: u.email }, { $setOnInsert: u }, { upsert: true, new: true });
  }

  for (const o of orgs) {
    await Organization.findOneAndUpdate({ membershipNo: o.membershipNo }, { $setOnInsert: o }, { upsert: true, new: true });
  }

  for (const m of members) {
    await Member.findOneAndUpdate({ membershipNo: m.membershipNo }, { $setOnInsert: m }, { upsert: true, new: true });
  }

  for (const p of packages) {
    await PackageTaken.findOneAndUpdate(
      { member: p.member, firstPackageName: p.firstPackageName },
      { $set: p },
      { upsert: true, new: true }
    );
  }

  for (const pay of payments) {
    await Payment.findOneAndUpdate(
      { paymentId: pay.paymentId },
      { $setOnInsert: pay },
      { upsert: true, new: true }
    );
  }

  for (const inv of invoices) {
    await Invoice.findOneAndUpdate(
      { invoiceNumber: inv.invoiceNumber },
      { $setOnInsert: inv },
      { upsert: true, new: true }
    );
  }
}



// router.post("/migrate-to-membership" migrateMembership);




router.post("/migrate-stage-data", async (req, res) => {
  try {
    const stageDocs = await StageData.find({});
    if (!stageDocs.length) return res.status(404).json({ message: "No stage data found." });

    const batchSize = 100;
    let batchUsers = [], batchOrgs = [], batchMembers = [], batchPackages = [], batchPayments = [], batchInvoices = [];

    for (let i = 0; i < stageDocs.length; i++) {
      const doc = stageDocs[i];
      const hashedPassword = await bcrypt.hash(doc.Email + "1234", 10);

      // User
      const user = {
        name: doc.NameofChiefFunctionary || "Unknown",
        email: (doc.Email && doc.Email.split(/[,; ]+/)[0].trim()) || "unknown@example.com",
        password: hashedPassword,
        membershipNo: doc.MembershipNo
      };
      batchUsers.push(user);

      // Organization
      const org = {
        name: doc.NameoftheEntity,
        membershipNo: doc.MembershipNo,
        email: doc.Email,
        phone: doc.Mobile,
        address: doc.AddressofCorrespondence,
        plan: doc.FirstPackageName,
      };
      batchOrgs.push(org);

      // Member
      const member = {
        membershipNo: doc.MembershipNo,
        membershipCompany: doc.MembershipCompany,
        gstStatus: doc.GSTStatus,
        GSTNumber: doc.GSTNumber,
        panNo: doc.PANNo,
        yearOfIncorporation: doc.YearofIncorporation,
        membershipSource: doc.MembershipSource
      };
      batchMembers.push(member);

      // Packages
      if (doc.FirstPackageName) batchPackages.push({
        member: doc.MembershipNo,
        firstPackageName: doc.FirstPackageName,
        membershipFeesAmount: Number(doc.MembershipFessAmountInclusiveGST || 0)
      });

      if (doc.FinalPackageName) batchPackages.push({
        member: doc.MembershipNo,
        firstPackageName: doc.FinalPackageName,
        membershipFeesAmount: Number(doc.FinalAmount || 0)
      });

      // Payment & Invoice
      if (doc.PaymentId) {
        // Payment collection
        const payment = {
          paymentId: doc.PaymentId,
          membershipNo: doc.MembershipNo,
          amount: Number(doc.FinalAmount || doc.MembershipFessAmountInclusiveGST || 0),
          source: doc.PaymentSource || "cash",
          status: "success",
          date: doc.RenewalPaymentDate || doc.FirstPaymentDate
        };
        batchPayments.push(payment);

        // Invoice embedding the payment
        const invoice = {
          invoiceNumber: `INV-${doc.MembershipNo}-${i + 1}`,
          member: undefined, // will link after member exists
          membershipNo: doc.MembershipNo,
          packageName: doc.FinalPackageName || doc.FirstPackageName,
          description: "Migrated from StageData",
          amount: payment.amount,
          gstAmount: 0,
          discount: 0,
          totalAmount: payment.amount,
          issueDate: payment.date ? new Date(payment.date) : new Date(),
          dueDate: null,
          payments: [{
            paymentId: payment.paymentId,
            membershipNo: payment.membershipNo,
            amount: payment.amount,
            source: payment.source,
            status: payment.status,
            date: payment.date ? new Date(payment.date) : new Date()
          }],
          status: payment.status === "success" ? "paid" : "pending"
        };
        batchInvoices.push(invoice);
      }

      // Batch insert
      if ((i + 1) % batchSize === 0) {
        await insertBatch(batchUsers, batchOrgs, batchMembers, batchPackages, batchPayments, batchInvoices);
        batchUsers = []; batchOrgs = []; batchMembers = [];
        batchPackages = []; batchPayments = []; batchInvoices = [];
      }
    }

    // leftover insert
    if (batchUsers.length > 0) {
      await insertBatch(batchUsers, batchOrgs, batchMembers, batchPackages, batchPayments, batchInvoices);
    }

    res.json({ message: "Migration completed successfully with invoices." });

  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
