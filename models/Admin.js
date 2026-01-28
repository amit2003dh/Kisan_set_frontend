const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  permissions: {
    userManagement: {
      type: Boolean,
      default: true
    },
    productionVerification: {
      type: Boolean,
      default: true
    },
    deliveryVerification: {
      type: Boolean,
      default: true
    },
    orderManagement: {
      type: Boolean,
      default: true
    },
    analytics: {
      type: Boolean,
      default: true
    },
    systemSettings: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ip: String,
    userAgent: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Hash password before saving - TEMPORARILY DISABLED
// adminSchema.pre('save', async function(next) {
//   console.log('Pre-save hook called');
//   if (!this.isModified('password')) {
//     console.log('Password not modified, skipping hash');
//     return next();
//   }
//   
//   try {
//     console.log('Hashing password...');
//     const salt = await bcrypt.genSalt(12);
//     this.password = await bcrypt.hash(this.password, salt);
//     console.log('Password hashed successfully');
//     next();
//   } catch (error) {
//     console.error('Error hashing password:', error);
//     next(error);
//   }
// });

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update last login
adminSchema.methods.updateLastLogin = function(ip, userAgent) {
  this.lastLogin = new Date();
  this.loginHistory.push({
    timestamp: new Date(),
    ip: ip,
    userAgent: userAgent
  });
  return this.save();
};

// Get admin info without password
adminSchema.methods.toSafeObject = function() {
  const admin = this.toObject();
  delete admin.password;
  return admin;
};

module.exports = mongoose.model('Admin', adminSchema);
