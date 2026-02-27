import { Router } from 'express';
import { getRates } from '../controllers/rates.controller';

const router = Router();

router.get('/', getRates);

export default router;
