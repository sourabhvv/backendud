import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  website: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL'
    }
  },
  description: { 
    type: String,
    maxlength: 1000
  },
  email: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email must be valid'
    }
  },
  phone: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[\+]?[1-9][\d]{0,15}$/.test(v);
      },
      message: 'Phone must be valid'
    }
  },
  sector: { 
    type: String,
    enum: [
      'Manufacturing', 'Services', 'Agriculture', 'Technology', 'Healthcare', 
      'Finance', 'Education', 'E-commerce', 'Retail', 'Other'
    ]
  },
  category: { 
    type: String,
    enum: ['micro', 'small', 'medium', 'startup', 'other']
  },
  state: { 
    type: String,
    required: true
  },
  city: { 
    type: String,
    required: true
  },
  pincode: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[1-9][0-9]{5}$/.test(v);
      },
      message: 'Pincode must be 6 digits'
    }
  },
  udyam_number: { 
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  gstin: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'GSTIN must be valid'
    }
  },
  cin_llpin: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(v) || 
               /^[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{5}$/.test(v);
      },
      message: 'CIN/LLPIN must be valid'
    }
  },
  tags: [{ 
    type: String,
    trim: true
  }],
  organization: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
businessSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for search functionality
businessSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text' 
});

// Index for filtering
businessSchema.index({ state: 1, sector: 1, category: 1, status: 1 });

export default mongoose.model('Business', businessSchema);

