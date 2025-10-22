import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
  fromOrg: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  toOrg: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  status: { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
  message:{type:String,required:false},
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Connection', connectionSchema);
