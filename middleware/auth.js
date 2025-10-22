import jwt from 'jsonwebtoken';
import Membership from '../models/MemberShip.js';
import User from "../models/User.js";
export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // includes { id, email, role, org }
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// optional: role-based guard
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// middleware to check if user's membership is active
export async function requireActiveMembership(req, res, next) {
  try {
    // Check if user is authenticated
    if (!req.user.id) {
      return res.status(401).json({ 
        errorType:"MembershipNotFound",
        message: 'User not authenticated or no membership number found' 
      });
    }

    const user = await User.findById(req.user.id);
    console.log('User fetched:', user);
    


    // Find the membership record
    const membership = await Membership.findOne({ 
      membershipNo: user.membershipNo 
    });


    if (!membership) {
      return res.status(403).json({ 
        errorType:"MembershipNotFound",
        message: 'Membership not found' 
      });
    }

    // Check if membership status is active
    if (membership.membershipStatus !== 'Active') {
      return res.status(403).json({ 
        errorType:"MembershipNotActive",
        message: 'Membership is not active. Current status: ' + membership.membershipStatus 
      });
    }

    // Check if membership has expired
    if (membership.ExpireDate && new Date() > new Date(membership.ExpireDate)) {
      return res.status(403).json({ 
        errorType:"MembershipExpired",
        message: 'Membership has expired' 
      });
    }

    console.log(membership);

    // Add membership info to request for use in routes
    req.membership = membership;
    next();
  } catch (error) {
    console.error('Error checking membership:', error);
    return res.status(500).json({ 
      message: 'Internal server error while checking membership' 
    });
  }
}
