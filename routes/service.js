import { Router } from 'express';
import Service from '../models/Service.js';
import Organization from '../models/Organization.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res) => {
  const org = await Organization.findOne({ owner: req.user.id });
  const list = await Service.find({ org: org?._id });
  res.json(list);
});

router.post('/', auth, async (req, res) => {
  const org = await Organization.findOne({ owner: req.user.id });
  const item = await Service.create({ ...req.body, org: org._id });
  res.json(item);
});

router.delete('/:id', auth, async (req, res) => {
  await Service.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

export default router;
