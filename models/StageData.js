import mongoose from "mongoose";

const stageSchema = new mongoose.Schema({
  sn: { type: Number },
  MembershipNo: { type: String },
  MembershipCompany: { type: String },
  NameoftheEntity: { type: String },
  NameofChiefFunctionary: { type: String },
  DesignationofChiefFunctionary: { type: String },
  AddressofCorrespondence: { type: String },
  State: { type: String },
  Mobile: { type: Number },
  Email: { type: String },
  GSTStatus: { type: String },
  GSTNumber: { type: String },
  PANNo: { type: String },
  YearofIncorporation: { type: String },
  MembershipSource: { type: String },
  Source: { type: String },
  FirstPackageName: { type: String },
  MembershipFessAmountInclusiveGST: { type: Number },
  PaymentSource: { type: String },
  PaymentId: { type: String },
  FirstPaymentDate: { type: String },  // store as String (DD-MMM-YY) OR Date
  FirstEntryDate: { type: String },
  JoinDate: { type: String },
  ExpireDate: { type: String },
  RenewalCount: { type: Number },
  JoiningMonth: { type: String },
  ForthePeriods: { type: String },
  TotalNoofDaysPending: { type: Number },
  UpdateRenewalAndClientActivity: { type: String },
  WelcomeEmailIncludingCertificateLink: { type: String },
  EMAIL_SENT: { type: String },
  RenewalDocumentsTrigger: { type: Boolean },
  EmailerEmail: { type: String },
  WordCount: { type: Number },
  TotalEventAttend: { type: Number }
}, { timestamps: true });

export default mongoose.model("StageData", stageSchema, "stagedata");