import { User } from '../models/user'
import { getAuth } from '@clerk/express'
import { Request, Response } from 'express'
import { Match } from '../models/match'

export const getMatches = async (req: Request, res: Response) => {
    try {
        // validate req
        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const currUser = await User.findOne({ clerkId: userId });
        if (!currUser) {
            return res.status(404).json({ error: 'Failed to find User' });
        }

        const matches = await Match.find({
            $or: [
                { winner: currUser._id },
                { loser: currUser._id }
            ]
        })
        .populate('winner', 'username profilePicture rank')
        .populate('loser', 'username profilePicture rank')
        .sort({ createdAt: -1 });

        return res.status(200).json({ matches })

    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to get matches'
        });
    }
}