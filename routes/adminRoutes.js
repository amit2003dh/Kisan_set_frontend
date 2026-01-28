const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

// Secret key for admin registration (should be stored in environment variables)
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'KISANSETU_ADMIN_2024_SECRET';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to verify JWT token and get admin
const verifyAdminToken = async (req) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('No token provided');
  }

  const decoded = jwt.verify(token, JWT_SECRET);
  const admin = await Admin.findById(decoded.adminId);
  
  if (!admin) {
    throw new Error('Admin not found');
  }

  return admin;
};

// Admin signup with secret key
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    // Validate required fields
    if (!name || !email || !password || !secretKey) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "All fields are required"
      });
    }

    // Validate secret key
    if (secretKey !== ADMIN_SECRET_KEY) {
      return res.status(403).json({
        error: "Invalid secret key",
        message: "Secret key is required for admin registration"
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        error: "Admin already exists",
        message: "An admin with this email already exists"
      });
    }

    // Hash password manually since pre-save hook is disabled
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create new admin
    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        email: admin.email, 
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: "Admin account created successfully",
      token,
      admin: admin.toSafeObject()
    });

  } catch (error) {
    console.error("Admin signup error:", error);
    res.status(500).json({
      error: "Failed to create admin account",
      message: error.message
    });
  }
});

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect"
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        error: "Account inactive",
        message: "Your admin account has been deactivated"
      });
    }

    // Compare password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect"
      });
    }

    // Update last login
    await admin.updateLastLogin(
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        email: admin.email, 
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: "Login successful",
      token,
      admin: admin.toSafeObject()
    });

  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: error.message
    });
  }
});

// Get current admin profile
router.get('/profile', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    
    res.json({
      admin: admin.toSafeObject()
    });

  } catch (error) {
    console.error("Get admin profile error:", error);
    res.status(500).json({
      error: "Failed to get admin profile",
      message: error.message
    });
  }
});

// Update admin profile
router.put('/profile', async (req, res) => {
  try {
    const { name } = req.body;
    const admin = await verifyAdminToken(req);
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      admin._id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({
        error: "Admin not found",
        message: "Admin account not found"
      });
    }

    res.json({
      message: "Profile updated successfully",
      admin: updatedAdmin.toSafeObject()
    });

  } catch (error) {
    console.error("Update admin profile error:", error);
    res.status(500).json({
      error: "Failed to update profile",
      message: error.message
    });
  }
});

// Change admin password
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await verifyAdminToken(req);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Missing fields",
        message: "Current password and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Invalid password",
        message: "New password must be at least 6 characters long"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: "Invalid current password",
        message: "Current password is incorrect"
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      error: "Failed to change password",
      message: error.message
    });
  }
});

// Get all admins (super admin only)
router.get('/admins', async (req, res) => {
  try {
    const requestingAdmin = await verifyAdminToken(req);
    
    // Only super admin can view all admins
    if (requestingAdmin.role !== 'super_admin') {
      return res.status(403).json({
        error: "Access denied",
        message: "Only super admin can view all admins"
      });
    }

    const admins = await Admin.find({}).select('-password').sort({ createdAt: -1 });

    res.json({
      admins
    });

  } catch (error) {
    console.error("Get admins error:", error);
    res.status(500).json({
      error: "Failed to get admins",
      message: error.message
    });
  }
});

// Update admin status (super admin only)
router.put('/admins/:adminId/status', async (req, res) => {
  try {
    const requestingAdmin = await verifyAdminToken(req);
    const { isActive } = req.body;
    const targetAdminId = req.params.adminId;

    // Only super admin can update admin status
    if (requestingAdmin.role !== 'super_admin') {
      return res.status(403).json({
        error: "Access denied",
        message: "Only super admin can update admin status"
      });
    }

    // Can't deactivate self
    if (targetAdminId === requestingAdmin._id.toString()) {
      return res.status(400).json({
        error: "Cannot update own status",
        message: "You cannot update your own account status"
      });
    }

    const admin = await Admin.findByIdAndUpdate(
      targetAdminId,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        error: "Admin not found",
        message: "Target admin not found"
      });
    }

    res.json({
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      admin
    });

  } catch (error) {
    console.error("Update admin status error:", error);
    res.status(500).json({
      error: "Failed to update admin status",
      message: error.message
    });
  }
});

// Production verification routes
router.get('/productions', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { status, category } = req.query;
    
    const Crop = require('../models/Crop');
    const Product = require('../models/Product');
    
    // First, let's see what's in the database without any filters
    const allCrops = await Crop.find({});
    const allProducts = await Product.find({});
    
    console.log('Total crops in database:', allCrops.length);
    console.log('Total products in database:', allProducts.length);
    console.log('Crop isApproved values:', allCrops.map(c => ({ id: c._id, name: c.name, isApproved: c.isApproved })));
    console.log('Product isApproved values:', allProducts.map(p => ({ id: p._id, name: p.name, isApproved: p.isApproved })));
    
    let cropQuery = {};
    let productQuery = {};
    
    // Apply status filter to both queries
    if (status && status !== 'all') {
      if (status === 'pending') {
        cropQuery.isApproved = 'pending';
        productQuery.isApproved = 'pending';
      } else if (status === 'approved') {
        cropQuery.isApproved = 'approved';
        productQuery.isApproved = 'approved';
      } else if (status === 'rejected') {
        cropQuery.isApproved = 'rejected';
        productQuery.isApproved = 'rejected';
      }
    }
    
    console.log('Production verification - cropQuery:', cropQuery);
    console.log('Production verification - productQuery:', productQuery);
    
    // Fetch data based on category filter
    let crops = [];
    let products = [];
    
    if (category === 'crops') {
      // Only fetch crops
      crops = await Crop.find(cropQuery)
        .populate('sellerId', 'name email phone')
        .sort({ createdAt: -1 });
    } else if (category === 'products') {
      // Only fetch products
      products = await Product.find(productQuery)
        .populate('sellerId', 'name email phone')
        .sort({ createdAt: -1 });
    } else {
      // Fetch both (all categories or specific category)
      crops = await Crop.find(cropQuery)
        .populate('sellerId', 'name email phone')
        .sort({ createdAt: -1 });
      products = await Product.find(productQuery)
        .populate('sellerId', 'name email phone')
        .sort({ createdAt: -1 });
    }
    
    console.log('Production verification - fetched crops:', crops.length);
    console.log('Production verification - fetched products:', products.length);
    console.log('Production verification - sample crop:', crops[0]);
    console.log('Production verification - sample product:', products[0]);
    
    // Combine crops and products into a unified format
    const allItems = [
      ...crops.map(crop => ({
        ...crop.toObject(),
        type: 'crop',
        name: crop.name,
        quantity: crop.quantity,
        price: crop.price,
        isApproved: crop.isApproved,
        seller: crop.sellerId,
        category: crop.category || 'crop',
        images: crop.images || [],
        description: crop.description,
        location: crop.location,
        harvestDate: crop.harvestDate,
        qualityGrade: crop.qualityGrade
      })),
      ...products.map(product => ({
        ...product.toObject(),
        type: 'product',
        name: product.name,
        quantity: product.quantity || product.stock || 0,
        price: product.price,
        isApproved: product.isApproved,
        seller: product.sellerId,
        category: product.category || 'product',
        images: product.images || [],
        description: product.description,
        location: product.location,
        stock: product.stock
      }))
    ];
    
    // Get total counts from database (for category filter)
    const [totalCropCount, totalProductCount] = await Promise.all([
      Crop.countDocuments(),
      Product.countDocuments()
    ]);
    
    // Calculate status counts from current filtered data
    const pending = allItems.filter(item => item.isApproved === 'pending').length;
    const approved = allItems.filter(item => item.isApproved === 'approved').length;
    const rejected = allItems.filter(item => item.isApproved === 'rejected').length;
    
    res.json({
      productions: allItems,
      total: allItems.length,
      pending,
      approved,
      rejected,
      categories: {
        crops: totalCropCount,
        products: totalProductCount
      }
    });
    
  } catch (error) {
    console.error('Get productions error:', error);
    res.status(500).json({
      error: 'Failed to fetch productions',
      message: error.message
    });
  }
});

module.exports = router;

router.put('/productions/:productionId/verify', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { productionId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    
    // Import models
    const Crop = require('../models/Crop');
    const Product = require('../models/Product');
    
    let item = null;
    let itemType = null;
    
    // Try to find as crop first
    item = await Crop.findById(productionId).populate('sellerId', 'name email phone');
    if (item) {
      itemType = 'crop';
      // Update crop verification status
      item = await Crop.findByIdAndUpdate(
        productionId,
        { 
          isApproved: action === 'approve' ? 'approved' : 'rejected',
          verifiedBy: admin._id,
          verifiedAt: new Date()
        },
        { new: true }
      ).populate('sellerId', 'name email phone');
    } else {
      // Try to find as product
      item = await Product.findById(productionId).populate('sellerId', 'name email phone');
      if (item) {
        itemType = 'product';
        // Update product verification status
        item = await Product.findByIdAndUpdate(
          productionId,
          { 
            isApproved: action === 'approve' ? 'approved' : 'rejected',
            verifiedBy: admin._id,
            verifiedAt: new Date()
          },
          { new: true }
        ).populate('sellerId', 'name email phone');
      }
    }
    
    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'Crop or product not found'
      });
    }
    
    // Format response to match frontend expectations
    const responseItem = {
      ...item.toObject(),
      type: itemType,
      isApproved: item.isApproved
    };
    
    res.json({
      message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} ${action}d successfully`,
      production: responseItem
    });
    
  } catch (error) {
    console.error('Verify production error:', error);
    res.status(500).json({
      error: 'Failed to verify production',
      message: error.message
    });
  }
});

// Delivery partner verification routes
router.get('/delivery-partners', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { status } = req.query;
    
    // Import User model
    const User = require('../models/User');
    
    let query = { role: 'delivery_partner' };
    if (status && status !== 'all') {
      if (status === 'pending') {
        query['deliveryPartnerRegistration.applicationStatus'] = 'pending';
      } else if (status === 'approved') {
        query['deliveryPartnerRegistration.applicationStatus'] = 'approved';
      } else if (status === 'rejected') {
        query['deliveryPartnerRegistration.applicationStatus'] = 'rejected';
      }
    }
    
    // Fetch delivery partners from User collection
    const partners = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Get counts for each status
    const [total, pending, approved, rejected] = await Promise.all([
      User.countDocuments({ role: 'delivery_partner' }),
      User.countDocuments({ 
        role: 'delivery_partner', 
        'deliveryPartnerRegistration.applicationStatus': 'pending' 
      }),
      User.countDocuments({ 
        role: 'delivery_partner', 
        'deliveryPartnerRegistration.applicationStatus': 'approved' 
      }),
      User.countDocuments({ 
        role: 'delivery_partner', 
        'deliveryPartnerRegistration.applicationStatus': 'rejected' 
      })
    ]);
    
    // Format partners for frontend compatibility
    const formattedPartners = partners.map(partner => ({
      ...partner.toObject(),
      _id: partner._id,
      name: partner.name,
      email: partner.email,
      phone: partner.phone,
      isApproved: partner.deliveryPartnerRegistration.applicationStatus,
      seller: partner._id,
      applicationDate: partner.deliveryPartnerRegistration.applicationDate,
      hasApplied: partner.deliveryPartnerRegistration.hasApplied
    }));
    
    res.json({
      partners: formattedPartners,
      total,
      pending,
      approved,
      rejected
    });
    
  } catch (error) {
    console.error('Get delivery partners error:', error);
    res.status(500).json({
      error: 'Failed to fetch delivery partners',
      message: error.message
    });
  }
});

router.put('/delivery-partners/:partnerId/verify', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { partnerId } = req.params;
    const { action } = req.body;
    
    // Validate partnerId format
    if (!partnerId || partnerId === '1' || partnerId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid partner ID',
        message: 'Invalid delivery partner ID format'
      });
    }
    
    // Import User model
    const User = require('../models/User');
    
    // Check if the partnerId is a valid ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({
        error: 'Invalid partner ID',
        message: 'Invalid delivery partner ID format'
      });
    }
    
    // Update delivery partner verification status in User collection
    const partner = await User.findByIdAndUpdate(
      partnerId,
      { 
        'deliveryPartnerRegistration.applicationStatus': action === 'approve' ? 'approved' : 'rejected',
        'deliveryPartnerRegistration.applicationDate': new Date()
      },
      { new: true }
    ).select('-password');
    
    if (!partner) {
      return res.status(404).json({
        error: 'Delivery partner not found',
        message: 'Delivery partner application not found'
      });
    }
    
    res.json({
      message: `Delivery partner application ${action}d successfully`,
      partner: {
        ...partner.toObject(),
        isApproved: partner.deliveryPartnerRegistration.applicationStatus
      }
    });
    
  } catch (error) {
    console.error('Verify delivery partner error:', error);
    res.status(500).json({
      error: 'Failed to verify delivery partner',
      message: error.message
    });
  }
});

// User management routes
router.get('/users', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { role, status, search } = req.query;
    
    // Import User model
    const User = require('../models/User');
    
    let query = {};
    
    // Apply filters
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (status && status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'verified') {
        query.isVerified = true;
      } else if (status === 'unverified') {
        query.isVerified = false;
      }
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Fetch real user data from database
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      users,
      total: users.length
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

router.put('/users/:userId/:action', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { userId, action } = req.params;
    
    res.json({
      message: `User ${action}d successfully`,
      userId,
      action
    });
    
  } catch (error) {
    console.error('User action error:', error);
    res.status(500).json({
      error: 'Failed to perform user action',
      message: error.message
    });
  }
});

// Dashboard stats route
router.get('/dashboard-stats', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    
    // Import models to get real database data
    const User = require('../models/User');
    const Order = require('../models/Order');
    const Crop = require('../models/Crop');
    const DeliveryPartner = require('../models/DeliveryPartner');
    const Product = require('../models/Product');
    
    // Get real counts from database
    const [
      totalUsers,
      farmers,
      buyers,
      sellers,
      deliveryPartners,
      totalOrders,
      pendingCrops,
      pendingProducts,
      approvedCrops,
      approvedProducts,
      rejectedCrops,
      rejectedProducts,
      totalCrops,
      totalProducts
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'seller' }),
      User.countDocuments({ role: 'delivery_partner' }),
      Order.countDocuments(),
      // Count by status separately
      Crop.countDocuments({ isApproved: 'pending' }),
      Product.countDocuments({ isApproved: 'pending' }),
      Crop.countDocuments({ isApproved: 'approved' }),
      Product.countDocuments({ isApproved: 'approved' }),
      Crop.countDocuments({ isApproved: 'rejected' }),
      Product.countDocuments({ isApproved: 'rejected' }),
      // Count total crops and products
      Crop.countDocuments(),
      Product.countDocuments()
    ]);

    // Calculate totals by status
    const pendingVerifications = pendingCrops + pendingProducts;
    const approvedVerifications = approvedCrops + approvedProducts;
    const rejectedVerifications = rejectedCrops + rejectedProducts;

    // Calculate total revenue from completed orders
    const completedOrders = await Order.find({ status: 'completed' });
    const totalRevenue = completedOrders.reduce((sum, order) => {
      return sum + (order.total || 0);
    }, 0);

    res.json({
      totalUsers,
      farmers,
      buyers,
      sellers,
      deliveryPartners,
      pendingVerifications,
      approvedVerifications,
      rejectedVerifications,
      totalOrders,
      totalRevenue,
      totalCrops,
      totalProducts
    });
    
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      message: error.message
    });
  }
});

// Delivery partner verification routes
router.get('/delivery-partners', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { status } = req.query;
    
    // Import User model
    const User = require('../models/User');
    
    let query = { role: 'delivery_partner' };
    if (status && status !== 'all') {
      if (status === 'pending') {
        query['deliveryPartnerRegistration.applicationStatus'] = 'pending';
      } else if (status === 'approved') {
        query['deliveryPartnerRegistration.applicationStatus'] = 'approved';
      } else if (status === 'rejected') {
        query['deliveryPartnerRegistration.applicationStatus'] = 'rejected';
      }
    }
    
    // Fetch delivery partners from User collection (basic info only)
    const partners = await User.find(query)
      .select('name email phone deliveryPartnerRegistration createdAt')
      .sort({ createdAt: -1 });
    
    // Get counts for each status
    const [total, pending, approved, rejected] = await Promise.all([
      User.countDocuments({ role: 'delivery_partner' }),
      User.countDocuments({ 
        role: 'delivery_partner', 
        'deliveryPartnerRegistration.applicationStatus': 'pending' 
      }),
      User.countDocuments({ 
        role: 'delivery_partner', 
        'deliveryPartnerRegistration.applicationStatus': 'approved' 
      }),
      User.countDocuments({ 
        role: 'delivery_partner', 
        'deliveryPartnerRegistration.applicationStatus': 'rejected' 
      })
    ]);
    
    // Format partners for frontend (basic user info only)
    const formattedPartners = partners.map(partner => ({
      _id: partner._id,
      name: partner.name,
      email: partner.email,
      phone: partner.phone,
      isApproved: partner.deliveryPartnerRegistration.applicationStatus,
      applicationDate: partner.deliveryPartnerRegistration.applicationDate,
      hasApplied: partner.deliveryPartnerRegistration.hasApplied,
      createdAt: partner.createdAt
      // Note: We don't include detailed delivery partner info here
      // It will be fetched separately when user clicks "View Details"
    }));
    
    // Debug: Log the formatted data to see what's being sent
    console.log('Formatted partners data:', formattedPartners[0]);
    
    res.json({
      partners: formattedPartners,
      total,
      pending,
      approved,
      rejected
    });
    
  } catch (error) {
    console.error('Get delivery partners error:', error);
    res.status(500).json({
      error: 'Failed to fetch delivery partners',
      message: error.message
    });
  }
});

// New route to fetch detailed delivery partner info
router.get('/delivery-partners/:partnerId/details', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { partnerId } = req.params;
    
    // Validate partnerId format
    if (!partnerId || partnerId === '1' || partnerId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid partner ID',
        message: 'Invalid delivery partner ID format'
      });
    }
    
    // Import models
    const User = require('../models/User');
    
    // Check if the partnerId is a valid ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({
        error: 'Invalid partner ID',
        message: 'Invalid delivery partner ID format'
      });
    }
    
    // Fetch user data first
    const user = await User.findById(partnerId).select('-password');
    if (!user || user.role !== 'delivery_partner') {
      return res.status(404).json({
        error: 'Delivery partner not found',
        message: 'Delivery partner not found'
      });
    }
    
    // For now, return only user data since detailed delivery partner data may not exist
    // In the future, you can create DeliveryPartner records when users apply
    const partnerDetails = {
      // User data (always available)
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address || 'Not provided',
      isApproved: user.deliveryPartnerRegistration.applicationStatus,
      applicationDate: user.deliveryPartnerRegistration.applicationDate,
      hasApplied: user.deliveryPartnerRegistration.hasApplied,
      createdAt: user.createdAt,
      
      // Delivery partner details (placeholder for now)
      // These will be populated when DeliveryPartner records are created
      vehicle: {
        type: 'Not provided',
        number: 'Not provided',
        capacity: 0
      },
      currentLocation: { 
        lat: 0, 
        lng: 0, 
        lastUpdated: new Date() 
      },
      status: 'offline',
      isOnline: false,
      deliveryStats: { 
        totalDeliveries: 0, 
        successfulDeliveries: 0, 
        cancelledDeliveries: 0, 
        averageRating: 0, 
        totalEarnings: 0 
      },
      workingHours: { 
        start: '09:00', 
        end: '18:00', 
        workingDays: [] 
      },
      serviceArea: { 
        cities: [], 
        maxDistance: 50 
      },
      documents: {
        drivingLicense: null,
        vehicleRC: null,
        policeVerification: null,
        aadharCard: null
      },
      bankDetails: {
        accountNumber: null,
        ifscCode: null,
        accountHolderName: null
      }
    };
    
    res.json({
      partner: partnerDetails
    });
    
  } catch (error) {
    console.error('Get delivery partner details error:', error);
    res.status(500).json({
      error: 'Failed to fetch delivery partner details',
      message: error.message
    });
  }
});

// Order management routes
router.get('/orders', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { status } = req.query;
    
    // Import Order model
    const Order = require('../models/Order');
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Fetch real order data from database
    const orders = await Order.find(query)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 });
    
    // Get counts for each status based on Order schema enum
    const [total, pending, confirmed, pickedUp, inTransit, delivered, cancelled] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'Pending' }),
      Order.countDocuments({ status: 'Confirmed' }),
      Order.countDocuments({ status: 'Picked Up' }),
      Order.countDocuments({ status: 'In Transit' }),
      Order.countDocuments({ status: 'Delivered' }),
      Order.countDocuments({ status: 'Cancelled' })
    ]);
    
    res.json({
      orders,
      total,
      pending,
      confirmed,
      pickedUp,
      inTransit,
      delivered,
      cancelled
    });
    
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

// Order management routes
router.put('/orders/:orderId/:action', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { orderId } = req.params;
    const { action } = req.params;
    
    // Import Order model
    const Order = require('../models/Order');
    
    // Update order status in database
    let updateData = {};
    
    switch (action) {
      case 'confirm':
        updateData.status = 'processing';
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = admin._id;
        break;
      case 'complete':
        updateData.status = 'completed';
        updateData.completedAt = new Date();
        updateData.completedBy = admin._id;
        break;
      case 'cancel':
        updateData.status = 'cancelled';
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = admin._id;
        break;
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be confirm, complete, or cancel'
        });
    }
    
    const order = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    ).populate('buyerId', 'name email')
     .populate('sellerId', 'name email');
    
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'Order not found'
      });
    }
    
    res.json({
      message: `Order ${action}d successfully`,
      order
    });
    
  } catch (error) {
    console.error('Order action error:', error);
    res.status(500).json({
      error: 'Failed to perform order action',
      message: error.message
    });
  }
});

router.put('/productions/:productionId/verify', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { productionId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    
    // Import models
    const Crop = require('../models/Crop');
    const Product = require('../models/Product');
    
    let item = null;
    let itemType = null;
    
    // Try to find as crop first
    item = await Crop.findById(productionId).populate('sellerId', 'name email phone');
    if (item) {
      itemType = 'crop';
      // Update crop verification status
      item = await Crop.findByIdAndUpdate(
        productionId,
        { 
          isApproved: action === 'approve' ? 'approved' : 'rejected',
          verifiedBy: admin._id,
          verifiedAt: new Date()
        },
        { new: true }
      ).populate('sellerId', 'name email phone');
    } else {
      // Try to find as product
      item = await Product.findById(productionId).populate('sellerId', 'name email phone');
      if (item) {
        itemType = 'product';
        // Update product verification status
        item = await Product.findByIdAndUpdate(
          productionId,
          { 
            isApproved: action === 'approve' ? 'approved' : 'rejected',
            verifiedBy: admin._id,
            verifiedAt: new Date()
          },
          { new: true }
        ).populate('sellerId', 'name email phone');
      }
    }
    
    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'Crop or product not found'
      });
    }
    
    // Format response to match frontend expectations
    const responseItem = {
      ...item.toObject(),
      type: itemType,
      verified: item.isApproved === 'approved', // Keep for backward compatibility
      isApproved: item.isApproved // Send the actual isApproved field
    };
    
    res.json({
      message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} ${action}d successfully`,
      production: responseItem
    });
    
  } catch (error) {
    console.error('Verify production error:', error);
    res.status(500).json({
      error: 'Failed to verify production',
      message: error.message
    });
  }
});
router.get('/analytics', async (req, res) => {
  try {
    const admin = await verifyAdminToken(req);
    const { timeRange, userType } = req.query;
    
    // Import models
    const User = require('../models/User');
    const Order = require('../models/Order');
    const Crop = require('../models/Crop');
    const Product = require('../models/Product');
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    // Build user query based on userType filter
    let userQuery = {};
    if (userType && userType !== 'all') {
      userQuery.role = userType;
    }
    
    // Get user statistics
    const [totalUsers, activeUsers, usersByRole] = await Promise.all([
      User.countDocuments(userQuery),
      User.countDocuments({ 
        ...userQuery,
        isActive: true,
        lastLogin: { $gte: startDate }
      }),
      User.aggregate([
        { $match: userQuery },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])
    ]);
    
    // Get order statistics
    const [totalOrders, orderStats, totalRevenue] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startDate } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: 'Delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);
    
    // Get production statistics
    const [totalCrops, totalProducts, productionStats] = await Promise.all([
      Crop.countDocuments({ createdAt: { $gte: startDate } }),
      Product.countDocuments({ createdAt: { $gte: startDate } }),
      Promise.all([
        Crop.countDocuments({ createdAt: { $gte: startDate }, isApproved: 'approved' }),
        Crop.countDocuments({ createdAt: { $gte: startDate }, isApproved: 'pending' }),
        Product.countDocuments({ createdAt: { $gte: startDate }, isApproved: 'approved' }),
        Product.countDocuments({ createdAt: { $gte: startDate }, isApproved: 'pending' })
      ])
    ]);
    
    const [approvedCrops, pendingCrops, approvedProducts, pendingProducts] = productionStats;
    
    // Get user growth data (daily for last 30 days)
    const userGrowth = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dailyUsers = await User.countDocuments({
        ...userQuery,
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      userGrowth.push({
        date: date.toISOString().split('T')[0],
        users: dailyUsers
      });
    }
    
    // Get revenue data (daily for last 30 days)
    const revenueData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dailyRevenue = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: date, $lt: nextDate },
            status: 'Delivered'
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      
      revenueData.push({
        date: date.toISOString().split('T')[0],
        revenue: dailyRevenue[0]?.total || 0
      });
    }
    
    // Get revenue breakdown by user type
    const revenueByUserType = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'Delivered' } },
      {
        $lookup: {
          from: 'users',
          localField: 'buyerId',
          foreignField: '_id',
          as: 'buyer'
        }
      },
      { $unwind: '$buyer' },
      {
        $group: {
          _id: '$buyer.role',
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      }
    ]);
    
    // Get revenue breakdown by category (crops vs products)
    const revenueByCategory = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'Delivered' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'crops',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'crop'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $addFields: {
          category: {
            $cond: {
              if: { $gt: [{ $size: '$crop' }, 0] },
              then: 'crop',
              else: {
                $cond: {
                  if: { $gt: [{ $size: '$product' }, 0] },
                  then: 'product',
                  else: 'unknown'
                }
              }
            }
          },
          itemRevenue: { $multiply: ['$items.quantity', '$items.price'] }
        }
      },
      {
        $group: {
          _id: '$category',
          revenue: { $sum: '$itemRevenue' },
          quantity: { $sum: '$items.quantity' },
          orders: { $addToSet: '$_id' }
        }
      },
      {
        $addFields: {
          orderCount: { $size: '$orders' }
        }
      },
      {
        $project: {
          orders: 0
        }
      }
    ]);
    
    // Get top selling crops and products separately
    const [topCrops, topProducts] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: 'Delivered' } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'crops',
            localField: 'items.itemId',
            foreignField: '_id',
            as: 'crop'
          }
        },
        { $unwind: '$crop' },
        {
          $group: {
            _id: '$crop.name',
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: 'Delivered' } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.itemId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$product.name',
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ])
    ]);
    
    // Get top products/crops (combined)
    const topItems = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);
    
    // Format order stats
    const formattedOrderStats = {
      Pending: 0,
      Confirmed: 0,
      'Picked Up': 0,
      'In Transit': 0,
      Delivered: 0,
      Cancelled: 0
    };
    
    orderStats.forEach(stat => {
      formattedOrderStats[stat._id] = stat.count;
    });
    
    // Format users by role
    const formattedUsersByRole = {
      farmer: 0,
      buyer: 0,
      seller: 0,
      delivery_partner: 0
    };
    
    usersByRole.forEach(stat => {
      formattedUsersByRole[stat._id] = stat.count;
    });
    
    res.json({
      overview: {
        totalUsers,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        activeUsers,
        totalCrops,
        totalProducts
      },
      userGrowth,
      revenueData,
      topProducts,
      topCrops,
      topItems,
      orderStats: formattedOrderStats,
      usersByRole: formattedUsersByRole,
      productionStats: {
        approved: approvedCrops + approvedProducts,
        pending: pendingCrops + pendingProducts
      },
      revenueBreakdown: {
        byUserType: revenueByUserType,
        byCategory: revenueByCategory
      }
    });
    
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

module.exports = router;
