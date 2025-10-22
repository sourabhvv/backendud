import mongoose from "mongoose";

const PackgeSchema = new mongoose.Schema({
    packageName:{type:String,require:true,unique:true},
    issueDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin/staff who created the bill  
});
export const Package= mongoose.model("package", PackgeSchema);
