// User Model
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
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
    enum: ["farmer", "buyer", "seller", "delivery", "admin"],
    default: "farmer"
  },
  location: String
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

