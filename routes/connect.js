import { Router } from 'express';
import Connection from '../models/Connection.js';
import Organization from '../models/Organization.js';
import { auth } from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = Router();

router.post('/request/:toOrgId', auth, async (req, res) => {
  const me = await Organization.findOne({ owner: req.user.id });
  const conn = await Connection.create({ fromOrg: me._id, toOrg: req.params.toOrgId });
  const msg = await Message.create({ fromOrg: me._id, toOrg: req.params.toOrgId, text: req.body.message });
  res.json(conn);
});

// POST /respond/:id
// :id here is the connection ID
router.post('/respond/:id', auth, async (req, res) => {
  try {
    const { action } = req.body; // "accepted" or "rejected"
    const connectionId = req.params.id;

    // find the org of logged-in user
    const me = await Organization.findOne({ owner: req.user.id });
    if (!me) {
      return res.status(404).json({ error: "Organization not found for user" });
    }

    // fetch connection
    const conn = await Connection.findById(connectionId);
    if (!conn) {
      return res.status(404).json({ error: "Connection not found" });
    }

    // check if current org is part of this connection
    if (
      conn.toOrg.toString() !== me._id.toString() &&
      conn.fromOrg.toString() !== me._id.toString()
    ) {
      return res.status(403).json({ error: "Not allowed" });
    }

    // update status
    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    conn.status = action;
    await conn.save();

    res.json(conn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


router.get('/mine', auth, async (req, res) => {
  const me = await Organization.findOne({ owner: req.user.id });
  const list = await Connection.find({ $or: [{ fromOrg: me._id }, { toOrg: me._id } ] }).populate('fromOrg toOrg');
  res.json(list);
});






export default router;
