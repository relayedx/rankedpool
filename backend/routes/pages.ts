import express from 'express'
import multer from 'multer'
import { NextFunction, Request, Response } from 'express'
import { getUser, createUser, getLeaderboard, updateProfilePicture, removeProfilePicture } from '../controllers/userController'
const router = express.Router();

const profilePictureUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024
    }
});

const handleProfilePictureUpload = (req: Request, res: Response, next: NextFunction) => {
    profilePictureUpload.single('profilePicture')(req, res, error => {
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Profile picture must be 3MB or smaller' });
            }

            return res.status(400).json({ error: error.message });
        }

        if (error) {
            return res.status(400).json({ error: 'Failed to upload profile picture' });
        }

        next();
    });
}

// routes called from LandingPage
router.get('/user', getUser);
router.post('/user/onboarding', createUser);
router.patch('/user/profile-picture', handleProfilePictureUpload, updateProfilePicture);
router.delete('/user/profile-picture', removeProfilePicture);
router.get('/leaderboard', getLeaderboard);

export default router
