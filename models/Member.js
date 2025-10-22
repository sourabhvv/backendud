import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  membershipNo: { type: String, required: true },   // Membership No
  membershipCompany: { type: String, required: true }, // Membership Company
  gstStatus: { type: String, enum: ["Registered", "Unregistered", "Exempted"], default: "Unregistered" },
  panNo: { type: String },
  yearOfIncorporation: { type: String }, // Year of Incorporation / Establishment
  membershipSource: { type: String },
  GSTNumber:{type:String} // Membership Source
}, { timestamps: true });

export default mongoose.model('Member', MemberSchema);











