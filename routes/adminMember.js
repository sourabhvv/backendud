import Member from '../models/Member.js';
import { auth,requireRole } from '../middleware/auth.js';
import { getallMembers, getMemberInvoice, getMemberOrganization, migrateMembership, updateMemberOrganization } from '../controllers/admin.controller.js';

import { Router } from "express";

const router = Router();

router.get("/members",auth,requireRole("admin"),getallMembers);
router.get("/invoices/:memberId",auth,requireRole("admin"),getMemberInvoice);
router.get("/members/:memberId/organization",auth,requireRole("admin"),getMemberOrganization);
router.put("/members/:memberId/organization",auth,requireRole("admin"),updateMemberOrganization);



// migrate data from stagin to membership 
router.post("/migrate-to-membership",auth,requireRole("admin"),migrateMembership);
export default router;


