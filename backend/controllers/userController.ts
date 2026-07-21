import { User } from '../models/user'
import { getAuth } from '@clerk/express'
import { Request, Response } from 'express'
import { clerkClient } from '@clerk/express'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import type { Buffer } from 'node:buffer'
import { deleteProfilePictureFromR2, uploadProfilePictureToR2 } from '../config/r2'

const rankOrder = ['iron', 'bronze', 'silver', 'gold', 'diamond'] as const;
const allowedProfilePictureTypes = ['image/jpeg', 'image/png', 'image/webp'];
const defaultProfilePicture = 'images/default-profile-pic.png';

type UploadedProfilePicture = {
    buffer: Buffer
    mimetype: string
}

type ProfilePictureRequest = Request & {
    file?: UploadedProfilePicture | undefined
}

const getRankValue = (rank: string) => {
    return rankOrder.indexOf(rank as typeof rankOrder[number]);
}

// access: private
export const getUser = async(req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);
        // validate whether userId exists 
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return res.status(200).json({
                needsOnboarding: true
            });
        }

        return res.status(200).json({
            needsOnboarding: false,
            user
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to get user' });
    }
}

// access: private
export const createUser = async(req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);
        // validate whether userId exists
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // check if user already exists
        const existingUser = await User.findOne({
            clerkId: userId
        })

        if (existingUser) {
            return res.status(200).json({ existingUser });
        }

        const { username } = req.body;

        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required' });
        }

        const formattedUsername = username.toLowerCase().trim();

        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;

        if (!email) {
            return res.status(400).json({ error: 'No email found for clerk user' });
        }

        const newUser = await User.create({
            clerkId: userId,
            email: email,
            username: formattedUsername,
            rank: 'iron',
            elo: 0
        });

        return res.status(201).json({ newUser });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
            return res.status(409).json({ error: 'Username or email is already in use' });
        }

        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create user' });
    }
}

// access: private
export const updateProfilePicture = async(req: ProfilePictureRequest, res: Response) => {
    let uploadedProfilePictureKey = '';

    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Profile picture is required' });
        }

        if (!allowedProfilePictureTypes.includes(file.mimetype)) {
            return res.status(400).json({ error: 'Only JPG, PNG, and WEBP images are allowed' });
        }

        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return res.status(404).json({ error: 'Could not find user' });
        }

        let optimizedImage: Buffer;

        try {
            optimizedImage = await sharp(file.buffer)
                .rotate()
                .resize({
                    width: 512,
                    height: 512,
                    fit: 'cover',
                    position: 'center'
                })
                .webp({ quality: 82 })
                .toBuffer();
        } catch (error) {
            return res.status(400).json({ error: 'Invalid image file' });
        }

        const previousProfilePictureKey = user.profilePictureKey;
        const profilePictureKey = `profile-pictures/${String(user._id)}/${randomUUID()}.webp`;
        const profilePictureUrl = await uploadProfilePictureToR2({
            key: profilePictureKey,
            body: optimizedImage,
            contentType: 'image/webp'
        });
        uploadedProfilePictureKey = profilePictureKey;

        user.profilePicture = profilePictureUrl;
        user.profilePictureKey = profilePictureKey;
        await user.save();
        uploadedProfilePictureKey = '';

        if (previousProfilePictureKey) {
            deleteProfilePictureFromR2(previousProfilePictureKey).catch(error => {
                console.error('Failed to delete previous profile picture from R2:', error);
            });
        }

        return res.status(200).json({ user });
    } catch (error) {
        if (uploadedProfilePictureKey) {
            deleteProfilePictureFromR2(uploadedProfilePictureKey).catch(cleanupError => {
                console.error('Failed to clean up uploaded profile picture from R2:', cleanupError);
            });
        }

        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to update profile picture'
        });
    }
}

// access: private
export const removeProfilePicture = async(req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return res.status(404).json({ error: 'Could not find user' });
        }

        const previousProfilePictureKey = user.profilePictureKey;

        user.profilePicture = defaultProfilePicture;
        user.profilePictureKey = '';
        await user.save();

        if (previousProfilePictureKey) {
            deleteProfilePictureFromR2(previousProfilePictureKey).catch(error => {
                console.error('Failed to delete removed profile picture from R2:', error);
            });
        }

        return res.status(200).json({ user });
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to remove profile picture'
        });
    }
}

// access: private
export const getLeaderboard = async(req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const players = await User.find({})
            .select('username rank elo')
            .lean();

        const sortedPlayers = players.sort((playerA, playerB) => {
            const rankDifference = getRankValue(playerB.rank) - getRankValue(playerA.rank);

            if (rankDifference !== 0) {
                return rankDifference;
            }

            if (playerB.elo !== playerA.elo) {
                return playerB.elo - playerA.elo;
            }

            return playerA.username.localeCompare(playerB.username);
        });

        return res.status(200).json({ players: sortedPlayers });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to get leaderboard' });
    }
}
