import express from 'express'
import { getUser, createUser } from '../controllers/userController'
const router = express.Router();

// routes called from LandingPage
router.get('/user', getUser);
router.post('/user/onboarding', createUser);

export default router