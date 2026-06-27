import { User } from '../models/user'
import { getAuth } from '@clerk/express'
import { Request, Response } from 'express'
import { clerkClient } from '@clerk/express'

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
