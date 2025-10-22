// import { Router } from 'express';
// import Message from '../models/Message.js';
// import Organization from '../models/Organization.js';
// import { auth } from '../middleware/auth.js';

// const router = Router();

// // 📌 Get conversation + update seen


// router.get('/new/:withOrgId', auth, async (req, res) => {
//   const me = await Organization.findOne({ owner: req.user.id });
//   const other = req.params.withOrgId;

//   // Find all messages between the two orgs

//   const list = await Message.find({
//     $or: [
//       { fromOrg: me._id, toOrg: other ,status:"sent"},
//       { fromOrg: other, toOrg: me._id ,status:"sent"}
//     ]
//   }).sort({ createdAt: 1 });

//   // Mark messages sent TO me as "seen"
//   await Message.updateMany(
//     { fromOrg: other, toOrg: me._id, status: { $ne: "seen" } },
//     { $set: { status: "seen" } }
//   );

//   res.json(list);
// });

// router.get('/:withOrgId', auth, async (req, res) => {
//   const me = await Organization.findOne({ owner: req.user.id });
//   const other = req.params.withOrgId;

//   // Find all messages between the two orgs
//   const list = await Message.find({
//     $or: [
//       { fromOrg: me._id, toOrg: other },
//       { fromOrg: other, toOrg: me._id }
//     ]
//   }).sort({ createdAt: 1 });

//   // Mark messages sent TO me as "seen"
//   await Message.updateMany(
//     { fromOrg: other, toOrg: me._id, status: { $ne: "seen" } },
//     { $set: { status: "seen" } }
//   );

//   res.json(list);
// });


// // 📌 Send new message (default = sent)
// router.post('/:withOrgId', auth, async (req, res) => {
//   const me = await Organization.findOne({ owner: req.user.id });
//   const other = req.params.withOrgId;

//   const msg = await Message.create({
//     fromOrg: me._id,
//     toOrg: other,
//     text: req.body.text,
//     status: "sent"
//   });

//   res.json(msg);
// });

// export default router;



import { Router } from 'express';
import Message from '../models/Message.js';
import Organization from '../models/Organization.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// 📌 Get conversation + update seen
router.get('/new/:withOrgId', auth, async (req, res) => {
  try {
    const me = await Organization.findOne({ owner: req.user.id });
    
    if (!me) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const other = req.params.withOrgId;

    // Find all messages between the two orgs (remove status filter to get all messages)
    const list = await Message.find({
      $or: [
        { fromOrg: me._id, toOrg: other },
        { fromOrg: other, toOrg: me._id }
      ]
    }).sort({ createdAt: 1 });

    // Mark messages sent TO me as "seen" (only update "sent" messages)
    const updateResult = await Message.updateMany(
      { 
        fromOrg: other, 
        toOrg: me._id, 
        status: "sent" // Only update messages that are currently "sent"
      },
      { $set: { status: "seen" } }
    );

    console.log(`Updated ${updateResult.modifiedCount} messages to seen status`);
    
    res.json(list);
  } catch (error) {
    console.error('Error in /new/:withOrgId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:withOrgId', auth, async (req, res) => {
  try {
    const me = await Organization.findOne({ owner: req.user.id });
    
    if (!me) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const other = req.params.withOrgId;

    // Find all messages between the two orgs
    const list = await Message.find({
      $or: [
        { fromOrg: me._id, toOrg: other },
        { fromOrg: other, toOrg: me._id }
      ]
    }).sort({ createdAt: 1 });

    // Mark messages sent TO me as "seen" (only update "sent" messages)
    const updateResult = await Message.updateMany(
      { 
        fromOrg: other, 
        toOrg: me._id, 
        status: "sent" // Only update messages that are currently "sent"
      },
      { $set: { status: "seen" } }
    );

    console.log(`Updated ${updateResult.modifiedCount} messages to seen status`);
    
    res.json(list);
  } catch (error) {
    console.error('Error in /:withOrgId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 📌 Send new message (default = sent)
router.post('/:withOrgId', auth, async (req, res) => {
  try {
    const me = await Organization.findOne({ owner: req.user.id });
    
    if (!me) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const other = req.params.withOrgId;
    
    if (!req.body.text || req.body.text.trim() === '') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const msg = await Message.create({
      fromOrg: me._id,
      toOrg: other,
      text: req.body.text.trim(),
      status: "sent"
    });

    res.json(msg);
  } catch (error) {
    console.error('Error in POST /:withOrgId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 📌 Optional: Separate endpoint to manually mark messages as seen
router.patch('/:withOrgId/mark-seen', auth, async (req, res) => {
  try {
    const me = await Organization.findOne({ owner: req.user.id });
    
    if (!me) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const other = req.params.withOrgId;

    const updateResult = await Message.updateMany(
      { 
        fromOrg: other, 
        toOrg: me._id, 
        status: "sent"
      },
      { $set: { status: "seen" } }
    );

    res.json({ 
      message: `Marked ${updateResult.modifiedCount} messages as seen`,
      modifiedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error in PATCH /:withOrgId/mark-seen:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
