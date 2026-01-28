const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided or invalid token format'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find admin by ID
    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Admin not found'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Admin account is deactivated'
      });
    }

    // Add admin info to request object
    req.adminId = admin._id;
    req.admin = admin;
    req.adminRole = admin.role;
    req.adminPermissions = admin.permissions;

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Authentication failed'
    });
  }
};

// Check specific permission
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.adminPermissions || !req.adminPermissions[permission]) {
      return res.status(403).json({
        error: 'Access denied',
        message: `You don't have permission for ${permission}`
      });
    }
    next();
  };
};

// Check admin role
const checkRole = (roles) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.adminRole)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This action requires ${allowedRoles.join(' or ')} role`
      });
    }
    next();
  };
};

module.exports = {
  adminAuthMiddleware,
  checkPermission,
  checkRole
};
