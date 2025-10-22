import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  membershipNo: { type: String, required: true },
  membershipStatus: { type: String, required: true },
  JoinDate: { type: Date },
  ExpireDate: { type: Date },
  packageName: { type: String } // Fixed type + added comma above
});

export default mongoose.model("Membership", membershipSchema);
