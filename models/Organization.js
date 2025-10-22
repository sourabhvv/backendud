import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // New profile fields
  entityName: { type: String },
  companyName: { type: String },
  website: String,
  dateOfBirth: { type: Date },
  state: { type: String },
  country: { type: String },
  phone: String,
  officeAddress: { type: String },
  category: String,
  gstNumber: { type: String },
  turnover: { type: String },
  termsAccepted: { type: Boolean, default: false },

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
