import { Router } from 'express';
import MemberShip from '../models/MemberShip.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Get user membership
router.get('/user-membership', auth, async (req, res) => {
  try {
    console.log('Request received for /user-membership');
    console.log('Authenticated user ID:', req.user.id);

    const user = await User.findById(req.user.id);
    console.log('User fetched:', user);

    if (!user) {
      console.warn('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // const member = await Member.findOne({ owner: user._id });
    // console.log('Member fetched:', member);

    // if (!member) {
    //   console.warn('Member not found for user:', user._id);
    //   return res.json(null);
    // }

    const membership = await MemberShip.findOne({ membershipNo: user.membershipNo });
    console.log('Membership fetched:', membership);


    


    if (!membership) {
      console.warn('Membership not found for membershipNo:', member.membershipNo);
      return res.json(null);
    }

    console.log('Returning membership:', membership);
    res.json(membership);
  } catch (error) {
    console.error('Get user membership error:', error);
    res.status(500).json({ error: 'Failed to get user membership' });
  }
});

export default router;
