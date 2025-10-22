import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  fromOrg: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  toOrg: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  text: { type: String, required: true },
  status:{type:String,require:true},
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Message', messageSchema);
