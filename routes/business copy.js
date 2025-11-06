import express from 'express';
import Business from '../models/Business.js';
import Organization from '../models/Organization.js';
import Connection from '../models/Connection.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create a new business listing
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      website,
      description,
      email,
      phone,
      sector,
      category,
      state,
      city,
      pincode,
      udyam_number,
      gstin,
      cin_llpin,
      tags
    } = req.body;

    // Get the user's organization
    const organization = await Organization.findOne({ owner: req.user.id });
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const business = new Business({
      name,
      website,
      description,
      email,
      phone,
      sector,
      category,
      state,
      city,
      pincode,
      udyam_number,
      gstin,
      cin_llpin,
      tags: tags || [],
      organization: organization._id,
      status: 'pending' // New listings need admin approval
    });

    await business.save();
    res.status(201).json(business);
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'Failed to create business listing' });
  }
});

// Search businesses with filters - supports both /search and root / with items format
const searchBusinessesHandler = async (req, res, useItemsFormat = false) => {
  try {
    const {
      q,
      state,
      sector,
      category,
      page = 1,
      limit = 12
    } = req.query;

    const query = { status: 'approved' }; // Only show approved businesses

    // Text search
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    // Filter by state
    if (state) {
      query.state = state;
    }

    // Filter by sector
    if (sector) {
      query.sector = sector;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Business.countDocuments(query);
    const businesses = await Business.find(query)
      .populate('organization', 'name logoUrl bannerUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPages = Math.ceil(total / parseInt(limit));

    if (useItemsFormat) {
      res.json({
        items: businesses,
        total,
        page: parseInt(page),
        totalPages
      });
    } else {
      res.json({
        businesses,
        total,
        page: parseInt(page),
        totalPages
      });
    }
  } catch (error) {
    console.error('Error searching businesses:', error);
    res.status(500).json({ error: 'Failed to search businesses' });
  }
};

// GET /businesses/search - returns businesses format (existing)
router.get('/search', async (req, res) => {
  await searchBusinessesHandler(req, res, false);
});

// Get user's own business listings (must come before /:id)
router.get('/my/listings', auth, async (req, res) => {
  try {
    const organization = await Organization.findOne({ owner: req.user.id });
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const businesses = await Business.find({ organization: organization._id })
      .populate('organization', 'name logoUrl bannerUrl')
      .sort({ createdAt: -1 });

    res.json(businesses);
  } catch (error) {
    console.error('Error fetching user businesses:', error);
    res.status(500).json({ error: 'Failed to fetch business listings' });
  }
});

// Admin routes for managing business listings (must come before /:id)
router.get('/admin/pending', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const businesses = await Business.find({ status: 'pending' })
      .populate('organization', 'name logoUrl bannerUrl')
      .sort({ createdAt: -1 });

    res.json(businesses);
  } catch (error) {
    console.error('Error fetching pending businesses:', error);
    res.status(500).json({ error: 'Failed to fetch pending businesses' });
  }
});

// Admin approve/reject business listing (must come before /:id)
router.patch('/admin/:id/status', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected' });
    }

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('organization', 'name logoUrl bannerUrl');

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(business);
  } catch (error) {
    console.error('Error updating business status:', error);
    res.status(500).json({ error: 'Failed to update business status' });
  }
});

// GET /businesses - returns items format (for HTML reference) - must come before /:id
router.get('/', async (req, res) => {
  await searchBusinessesHandler(req, res, true);
});

// Get a specific business by ID (must come after all specific routes)
router.get('/:id', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('organization', 'name logoUrl bannerUrl description email phone website');
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(business);
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// Update business listing (only by owner)
router.put('/:id', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if user owns this business
    const organization = await Organization.findOne({ owner: req.user.id });
    if (!organization || business.organization.toString() !== organization._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this business' });
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      { ...req.body, status: 'pending' }, // Reset to pending when updated
      { new: true }
    ).populate('organization', 'name logoUrl bannerUrl');

    res.json(updatedBusiness);
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// Delete business listing (only by owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if user owns this business
    const organization = await Organization.findOne({ owner: req.user.id });
    if (!organization || business.organization.toString() !== organization._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this business' });
    }

    await Business.findByIdAndDelete(req.params.id);
    res.json({ message: 'Business listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});


export default router;

