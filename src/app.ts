import express from 'express';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './middleware/auth.middleware';
import apiRoutes from './routes/index';
import { setupSwagger } from './config/swagger';

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(authMiddleware);

setupSwagger(app);

app.use('/api', apiRoutes);

export default app;
