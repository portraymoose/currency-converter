import { Router } from 'express';
import { getUser, updateUser } from '../controllers/user.controller';

const router = Router();

router.get('/', getUser);
router.post('/', updateUser);

export default router;
