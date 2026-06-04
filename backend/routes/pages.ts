import express from 'express'
import { getUser, createUser } from '../controllers/userController'
const router = express.Router();

// protected routes
router.get('/user', getUser);
router.post('/user/onboarding', createUser);

export default router