import Member from '../models/Member.js';
import { auth,requireRole } from '../middleware/auth.js';
import { getallMembers, getMemberInvoice, migrateMembership } from '../controllers/admin.controller.js';

import { Router } from "express";

const router = Router();

router.get("/members",auth,requireRole("admin"),getallMembers);
router.get("/invoices/:memberId",auth,requireRole("admin"),getMemberInvoice);



// migrate data from stagin to membership 
router.post("/migrate-to-membership",auth,requireRole("admin"),migrateMembership);
export default router;


