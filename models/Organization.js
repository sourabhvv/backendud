// 

import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // New profile fields
  gender: { type: String, enum: ["male", "female", "other", "prefer-not-to-say"] },
  entityName: { type: String },
  companyName: { type: String },
  website: String,
  dateOfBirth: { type: Date },
  state: { type: String },
  country: { type: String },
  phone: String,
  countryCode: { type: String, default: "+91" },
  personalPhone: String,
  personalCountryCode: { type: String, default: "+91" },
  officeAddress: { type: String },
  pincode: { type: String },
  category: String,
  gstNumber: { type: String },
  turnover: { type: String },
  udyamRegistrationNo: { type: String },
  tags: [{ type: String }], // Business tags (B2B, B2C, Export, Marketing, Software)
  businessType: { 
    type: String, 
    enum: [
      "Sole Proprietorship", 
      "Partnership", 
      "One Person Company (OPC)", 
      "Private Limited Company", 
      "Public Limited Company", 
      "Limited Liability Partnership (LLP)", 
      "Section 8 Company"
    ] 
  },
  established: { type: Date },
  businessEmail: { type: String },
  msmeType: { 
    type: String, 
    enum: ["Micro", "Small", "Medium", "Startup"] 
  },
  aboutUs: { type: String },
  termsAccepted: { type: Boolean, default: false },
  
  // Public profile settings
  fieldVisibility: {
    type: Map,
    of: Boolean,
    default: {
      name: true,
      entityName: true,
      businessType: true,
      established: true,
      businessEmail: true,
      phone: true,
      officeAddress: true,
      country: true,
      state: true,
      category: true,
      turnover: true,
      udyamRegistrationNo: true,
      gstNumber: true,
      website: true,
      description: true,
      products: true,
      services: true
    }
  },
  selectedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  selectedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],

  // Legacy fields kept for backward compatibility
  logoUrl: String,
  membershipNo: { type: String }, // membership mapping used for invoices/members
  bannerUrl: String,
  bannerColor: { type: String, default: '#10b981' }, // New field for banner color
  profileImage: String, // New field for profile image
  description: String,
  email: String,
  address: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  plan: { type: String, default: 'free' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Organization', organizationSchema);
