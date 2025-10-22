import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  org: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  category: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  url: { 
    type: String 
  },
  image: { 
    type: String   // store paths like /uploads/xyz.png
  },
  status:{
    type:String,enum:['approved','pending','rejected'],
    default:'pending'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("Product", productSchema);
