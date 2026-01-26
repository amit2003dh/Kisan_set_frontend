// User Model
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema({
  label: String,
  address: { type: String },
  city: String,
  state: String,
  pincode: String,
  lat: Number,
  lng: Number
});

const businessLocationSchema = new mongoose.Schema({
  farmName: String,
  businessName: String,
  address: { type: String, required: true },
  city: String,
  state: String,
  pincode: String,
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  landmark: String,
  serviceRadius: { type: Number, default: 50 }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Phone number must be exactly 10 digits'
    }
  },
  profilePhoto: String,
  role: {
    type: String,
    enum: ["farmer", "buyer", "seller", "delivery_partner", "admin"],
    default: "farmer"
  },
  location: String, // Keep for backward compatibility
  address: addressSchema,
  businessLocation: businessLocationSchema, // For farmers and sellers
  isVerified: { type: Boolean, default: false },
  verificationDocuments: [String], // URLs to verification docs
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  preferences: {
    notifications: { type: Boolean, default: true },
    language: { type: String, default: "english" },
    currency: { type: String, default: "INR" }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model("User", userSchema);

