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
    gender,
    entityName,
    companyName,
    website,
    dateOfBirth,
    state,
    country,
    phone,
    countryCode,
    personalPhone,
    personalCountryCode,
    officeAddress,
    pincode,
    category,
    gstNumber,
    turnover,
    udyamRegistrationNo,
    businessType,
    established,
    businessEmail,
    msmeType,
    aboutUs,
    termsAccepted,
    tags,
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
      gender,
      entityName,
      companyName,
      website,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      state,
      country,
      phone,
      countryCode,
      personalPhone,
      personalCountryCode,
      officeAddress,
      pincode,
      category,
      gstNumber,
      turnover,
      udyamRegistrationNo,
      businessType,
      established: established ? new Date(established) : undefined,
      businessEmail,
      msmeType,
      aboutUs,
      termsAccepted,
      tags,
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
      yearOfIncorporation: yearOfIncorporation,
      membershipSource: membershipSource,
      source: "Udhyami Connect"

    });


    // update membershipNo in user
    await User.findByIdAndUpdate(req.user.id, { membershipNo });

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
      gender,
      entityName,
      companyName,
      website,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : org.dateOfBirth,
      state,
      country,
      phone,
      countryCode,
      personalPhone,
      personalCountryCode,
      officeAddress,
      pincode,
      category,
      gstNumber,
      turnover,
      udyamRegistrationNo,
      businessType,
      established: established ? new Date(established) : org.established,
      businessEmail,
      msmeType,
      aboutUs,
      termsAccepted,
      tags,
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
  const org = await Organization.findOne({ owner: req.user.id })
    .populate('selectedProducts')
    .populate('selectedServices');
  
  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }
  
  // Convert fieldVisibility Map to object for frontend
  const orgObj = org.toObject();
  if (org.fieldVisibility instanceof Map) {
    const fieldVisibilityObj = {};
    org.fieldVisibility.forEach((value, key) => {
      fieldVisibilityObj[key] = value;
    });
    orgObj.fieldVisibility = fieldVisibilityObj;
  }
  
  res.json(orgObj);
});


// Update public profile settings
router.put('/public-profile', auth, async (req, res) => {
  try {
    const { fieldVisibility, selectedProducts, selectedServices } = req.body;
    
    const org = await Organization.findOne({ owner: req.user.id });
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Handle fieldVisibility - convert object to Map if needed
    if (fieldVisibility) {
      if (!org.fieldVisibility) {
        org.fieldVisibility = new Map();
      }
      
      // Update each field visibility
      Object.keys(fieldVisibility).forEach(key => {
        org.fieldVisibility.set(key, fieldVisibility[key]);
      });
    }
    
    if (selectedProducts !== undefined) {
      org.selectedProducts = selectedProducts;
    }
    
    if (selectedServices !== undefined) {
      org.selectedServices = selectedServices;
    }
    
    await org.save();
    
    // Return updated organization with fieldVisibility converted to object
    const fieldVisibilityObj = {};
    if (org.fieldVisibility instanceof Map) {
      org.fieldVisibility.forEach((value, key) => {
        fieldVisibilityObj[key] = value;
      });
    } else {
      Object.assign(fieldVisibilityObj, org.fieldVisibility || {});
    }
    
    res.json({ 
      success: true, 
      message: 'Public profile updated successfully',
      fieldVisibility: fieldVisibilityObj,
      selectedProducts: org.selectedProducts,
      selectedServices: org.selectedServices
    });
  } catch (error) {
    console.error('Error updating public profile:', error);
    res.status(500).json({ error: 'Failed to update public profile' });
  }
});

router.get('/search', auth, async (req, res) => {
  const { q = '', category = '' } = req.query;
  const conds = [];

  if (q) conds.push({ name: new RegExp(q, 'i') });
  if (category) conds.push({ category });

  const filter = conds.length ? { $and: conds } : {};
  const list = await Organization.find(filter, { email: 0, phone: 0 }).limit(50);

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


// Get connection status between current user and a specific organization
router.get('/connection-status/:orgId', auth, async (req, res) => {
  try {
    const myOrg = await Organization.findOne({ owner: req.user.id });
    if (!myOrg) {
      return res.status(404).json({ error: 'Your organization not found' });
    }

    const targetOrgId = req.params.orgId;
    
    // Check if connection exists in either direction
    const connection = await Connection.findOne({
      $or: [
        { fromOrg: myOrg._id, toOrg: targetOrgId },
        { fromOrg: targetOrgId, toOrg: myOrg._id }
      ]
    });

    if (!connection) {
      return res.json({ 
        connected: false, 
        status: null,
        connectionId: null 
      });
    }

    res.json({ 
      connected: connection.status === 'accepted',
      status: connection.status,
      connectionId: connection._id
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// Get public profile by ID
router.get('/public/:id', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id)
      .populate('selectedProducts')
      .populate('selectedServices');
    
    if (!org) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Helper function to check field visibility (handles Map type)
    const isFieldVisible = (fieldName) => {
      if (!org.fieldVisibility) return true; // Default to visible if not set
      
      // If fieldVisibility is a Map, use .get() method
      if (org.fieldVisibility instanceof Map) {
        return org.fieldVisibility.get(fieldName) !== false;
      }
      
      // If it's a plain object, use direct access
      return org.fieldVisibility[fieldName] !== false;
    };
    
    // Filter out null products/services and ensure they're arrays
    const filterPopulated = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => item !== null && item !== undefined);
    };
    
    // Return only public fields based on fieldVisibility
    const publicProfile = {
      _id: org._id,
      name: isFieldVisible('name') ? org.name : null,
      entityName: isFieldVisible('entityName') ? org.entityName : null,
      businessType: isFieldVisible('businessType') ? org.businessType : null,
      established: isFieldVisible('established') ? org.established : null,
      businessEmail: isFieldVisible('businessEmail') ? org.businessEmail : null,
      phone: isFieldVisible('phone') ? org.phone : null,
      countryCode: isFieldVisible('phone') ? org.countryCode : null,
      website: isFieldVisible('website') ? org.website : null,
      officeAddress: isFieldVisible('officeAddress') ? org.officeAddress : null,
      country: isFieldVisible('country') ? org.country : null,
      state: isFieldVisible('state') ? org.state : null,
      category: isFieldVisible('category') ? org.category : null,
      turnover: isFieldVisible('turnover') ? org.turnover : null,
      udyamRegistrationNo: isFieldVisible('udyamRegistrationNo') ? org.udyamRegistrationNo : null,
      gstNumber: isFieldVisible('gstNumber') ? org.gstNumber : null,
      selectedProducts: isFieldVisible('products') ? filterPopulated(org.selectedProducts || []) : [],
      selectedServices: isFieldVisible('services') ? filterPopulated(org.selectedServices || []) : [],
      // Additional fields
      description: isFieldVisible('description') ? (org.description || org.aboutUs || '') : null,
      aboutUs: isFieldVisible('description') ? (org.aboutUs || org.description || '') : null,
      logoUrl: org.logoUrl || null,
      profileImage: org.profileImage || null,
      membershipNo: org.membershipNo || null,
      tags: org.tags || [],
      createdAt: org.createdAt || null
    };
    
    console.log('Public Profile - Products:', publicProfile.selectedProducts?.length, 'Services:', publicProfile.selectedServices?.length);
    console.log('Products visible:', isFieldVisible('products'), 'Services visible:', isFieldVisible('services'));
    
    res.json(publicProfile);
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
