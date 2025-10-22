import { Router } from 'express';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import Connection from '../models/Connection.js';
import Member from '../models/Member.js';
import MemberShip from '../models/MemberShip.js';
import { requireActiveMembership } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.post('/', auth, async (req, res) => {
  const {
    name,
    entityName,
    companyName,
    website,
    dateOfBirth,
    state,
    country,
    phone,
    officeAddress,
    category,
    gstNumber,
    turnover,
    termsAccepted,
    // legacy/optional fields for backward compatibility
    logoUrl,
    bannerUrl,
    description,
    email,
    address,
    plan
  } = req.body;
  let org = await Organization.findOne({ owner: req.user.id });
  if (!org) {
    // Generate membership number with UC202501 prefix
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const membershipNo = `UC${currentYear}${currentMonth}${timestamp}`;

    // Create organization first
    org = await Organization.create({
      name,
      entityName,
      companyName,
      website,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      state,
      country,
      phone,
      officeAddress,
      category,
      gstNumber,
      turnover,
      termsAccepted,
      logoUrl,
      bannerUrl,
      description,
      email,
      address,
      plan,
      membershipNo,
      owner: req.user.id
    });

    // Update user with organization reference
    await User.findByIdAndUpdate(req.user.id, { org: org._id });

    // Create Member entry
    await Member.create({
      owner: req.user.id,
      membershipNo,
      membershipCompany: org.name || org.companyName || 'Organization Member',
      gstStatus: gstNumber ? 'Registered' : 'Unregistered',
      GSTNumber: gstNumber,

      owner: req.user.id,
      gstNumber: gstNumber,
      panNo: panNo||'not found',
      yearOfIncorporation: yearOfIncorporation,
      membershipSource: membershipSource,
      source: "Udhyami Connect"

    });

    // Create Membership entry with pending status
    await MemberShip.create({
      membershipNo,
      membershipStatus: 'pending', 
      JoinDate: new Date(),
      packageName: plan || 'free'
    });

  } else {
    Object.assign(org, {
      name,
      entityName,
      companyName,
      website,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : org.dateOfBirth,
      state,
      country,
      phone,
      officeAddress,
      category,
      gstNumber,
      turnover,
      termsAccepted,
      logoUrl,
      bannerUrl,
      description,
      email,
      address,
      plan
    });
    await org.save();
  }
  res.json(org);
});






router.get('/dashboard', auth, async (req, res) => {
  const org = await Organization.findOne({ owner: req.user.id });
  res.json(org);
});



router.get('/mine', auth, async (req, res) => {
  const org = await Organization.findOne({ owner: req.user.id });
  res.json(org);
});

router.get('/search', auth, async (req, res) => {
  const { q = '', category = '' } = req.query;
  const conds = [];

  if (q) conds.push({ name: new RegExp(q, 'i') });
  if (category) conds.push({ category });

  const filter = conds.length ? { $and: conds } : {};
  const list = await Organization.find(filter).limit(50);

  // ensure this is the orgId
  const user = await User.findOne({ _id: req.user.id });


  const ConnUser = await Connection.find({ fromOrg: user.org });
  const ConMap = {};
  ConnUser.forEach(conn => {
    const toOrgId = conn.toOrg._id ? conn.toOrg._id.toString() : conn.toOrg.toString();
    ConMap[toOrgId] = conn.status;
  });

  const enrichedList = list.map(org => ({
    ...org.toObject(),
    status: ConMap[org._id.toString()] || null
  }));

  res.json(enrichedList);
});

// Upload profile image route
router.post('/upload-profile-image', auth, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const org = await Organization.findOne({ owner: req.user.id });
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Update organization with new profile image
    org.profileImage = `/uploads/${req.file.filename}`;
    await org.save();

    res.json({ 
      success: true, 
      profileImage: org.profileImage,
      message: 'Profile image uploaded successfully' 
    });
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// Update banner color route
router.put('/banner-color', auth, async (req, res) => {
  try {
    const { bannerColor } = req.body;
    
    if (!bannerColor) {
      return res.status(400).json({ error: 'Banner color is required' });
    }

    const org = await Organization.findOne({ owner: req.user.id });
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    org.bannerColor = bannerColor;
    await org.save();

    res.json({ 
      success: true, 
      bannerColor: org.bannerColor,
      message: 'Banner color updated successfully' 
    });
  } catch (error) {
    console.error('Banner color update error:', error);
    res.status(500).json({ error: 'Failed to update banner color' });
  }
});

export default router;
