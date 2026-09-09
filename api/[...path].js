import express from 'express';
import { authRouter } from '../server/auth-routes.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use('/api', authRouter);

export default app;

