import { Router } from 'express';
import currenciesRoutes from './currencies.routes';
import ratesRoutes from './rates.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/currencies', currenciesRoutes);
router.use('/rates', ratesRoutes);
router.use('/user', userRoutes);

export default router;
