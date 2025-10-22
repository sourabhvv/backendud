import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  description: String,
  images: [String],
  rate: String,
  category:String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Service', serviceSchema);
