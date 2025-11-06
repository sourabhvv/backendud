import express from 'express';
import Organization from '../models/Organization.js';
import { auth, requireActiveMembership } from '../middleware/auth.js';
import User from '../models/User.js';
import Connection from '../models/Connection.js';

const router = express.Router();

router.get('/search', auth, requireActiveMembership, async (req, res) => {
  try {
    const { q = '', category = '' } = req.query;
    const conditions = [];

    // Search by name (case-insensitive)
    if (q) conditions.push({ name: new RegExp(q, 'i') });

    // Filter by category if provided
    if (category) conditions.push({ category });

    const filter = conditions.length ? { $and: conditions } : {};

    // Fetch organizations (limit to 50)
    const orgList = await Organization.find(filter, { email: 0, phone: 0 }).limit(50);

    // Get current user
    const user = await User.findById(req.user.id);
    if (!user || !user.org) {
      return res.status(400).json({ error: 'User organization not found' });
    }

    // Fetch connections where user’s org is sender or receiver
    const sentConnections = await Connection.find({ fromOrg: user.org }).populate('toOrg', '_id');
    const receivedConnections = await Connection.find({ toOrg: user.org }).populate('fromOrg', '_id');

    console.log('Sent connections:', sentConnections.length);
    console.log('Received connections:', receivedConnections.length);

    // Build connection map
    const connectionMap = {};

    // Sent connections
    sentConnections.forEach(conn => {
      if (conn.toOrg) {
        connectionMap[conn.toOrg._id.toString()] = conn.status;
      }
    });

    // Received connections
    receivedConnections.forEach(conn => {
      if (conn.fromOrg) {
        connectionMap[conn.fromOrg._id.toString()] = conn.status;
      }
    });

    // Enrich org list with connection status
    const enrichedList = orgList.map(org => ({
      ...org.toObject(),
      status: connectionMap[org._id.toString()] || null,
    }));

    res.json(enrichedList);
  } catch (error) {
    console.error('Error in /search route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
