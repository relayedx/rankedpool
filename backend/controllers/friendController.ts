import { getAuth } from '@clerk/express'
import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { FriendRequest } from '../models/friendRequest'
import { User } from '../models/user'

const rankOrder = ['iron', 'bronze', 'silver', 'gold', 'diamond'] as const;

const getRankValue = (rank: string) => {
    return rankOrder.indexOf(rank as typeof rankOrder[number]);
}

const sortPlayers = <T extends { username: string; rank: string; elo: number }>(players: T[]) => {
    return players.sort((playerA, playerB) => {
        const rankDifference = getRankValue(playerB.rank) - getRankValue(playerA.rank);

        if (rankDifference !== 0) {
            return rankDifference;
        }

        if (playerB.elo !== playerA.elo) {
            return playerB.elo - playerA.elo;
        }

        return playerA.username.localeCompare(playerB.username);
    });
}

const escapeRegex = (value: string) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const findCurrentUser = async(req: Request) => {
    const { userId } = getAuth(req);

    if (!userId) {
        return null;
    }

    return User.findOne({ clerkId: userId });
}

export const getFriends = async(req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const currentUser = await User.findOne({ clerkId: userId }).select('friends');

        if (!currentUser) {
            return res.status(404).json({ error: 'Could not find user' });
        }

        const friendIds = Array.isArray(currentUser.friends) ? currentUser.friends : [];

        const friends = await User.find({ _id: { $in: friendIds } })
            .select('username rank elo profilePicture')
            .lean();

        return res.status(200).json({ friends: sortPlayers(friends) });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to get friends' });
    }
}

export const searchFriends = async(req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const username = typeof req.query.username === 'string' ? req.query.username.trim().toLowerCase() : '';

        if (!username) {
            return res.status(200).json({ users: [] });
        }

        const currentUser = await User.findOne({ clerkId: userId }).select('friends');

        if (!currentUser) {
            return res.status(404).json({ error: 'Could not find user' });
        }

        const friendIdSet = new Set(
            (Array.isArray(currentUser.friends) ? currentUser.friends : []).map(friendId => String(friendId))
        );
        const usernamePattern = new RegExp(`^${escapeRegex(username)}`, 'i');
        const users = await User.find({
            _id: { $ne: currentUser._id },
            username: usernamePattern
        })
            .select('username rank elo profilePicture')
            .limit(8)
            .lean();
        const userIds = users.map(user => user._id);
        const pendingRequests = await FriendRequest.find({
            status: 'pending',
            $or: [
                { sender: currentUser._id, receiver: { $in: userIds } },
                { sender: { $in: userIds }, receiver: currentUser._id }
            ]
        }).lean();

        const outgoingPendingSet = new Set(
            pendingRequests
                .filter(request => String(request.sender) === String(currentUser._id))
                .map(request => String(request.receiver))
        );
        const incomingPendingSet = new Set(
            pendingRequests
                .filter(request => String(request.receiver) === String(currentUser._id))
                .map(request => String(request.sender))
        );

        const usersWithFriendStatus = users.map(user => {
            const searchedUserId = String(user._id);
            let relationshipStatus = 'none';

            if (friendIdSet.has(searchedUserId)) {
                relationshipStatus = 'friend';
            } else if (outgoingPendingSet.has(searchedUserId)) {
                relationshipStatus = 'outgoing_pending';
            } else if (incomingPendingSet.has(searchedUserId)) {
                relationshipStatus = 'incoming_pending';
            }

            return {
                ...user,
                relationshipStatus
            };
        });

        return res.status(200).json({ users: sortPlayers(usersWithFriendStatus) });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to search players' });
    }
}

export const sendFriendRequest = async(req: Request, res: Response) => {
    try {
        const currentUser = await findCurrentUser(req);

        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const friendId = req.params.friendId;

        if (typeof friendId !== 'string' || !mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(400).json({ error: 'Valid friendId is required' });
        }

        if (String(currentUser._id) === friendId) {
            return res.status(400).json({ error: 'You cannot add yourself as a friend' });
        }

        const friend = await User.findById(friendId).select('username rank elo profilePicture');

        if (!friend) {
            return res.status(404).json({ error: 'Could not find player' });
        }

        const friendIds = Array.isArray(currentUser.friends) ? currentUser.friends : [];
        const alreadyFriends = friendIds.some(existingFriendId => String(existingFriendId) === friendId);

        if (alreadyFriends) {
            return res.status(200).json({
                friend,
                relationshipStatus: 'friend'
            });
        }

        const existingPendingRequest = await FriendRequest.findOne({
            status: 'pending',
            $or: [
                { sender: currentUser._id, receiver: friend._id },
                { sender: friend._id, receiver: currentUser._id }
            ]
        });

        if (existingPendingRequest) {
            const isOutgoingRequest = String(existingPendingRequest.sender) === String(currentUser._id);

            return res.status(200).json({
                request: existingPendingRequest,
                relationshipStatus: isOutgoingRequest ? 'outgoing_pending' : 'incoming_pending'
            });
        }

        const friendRequest = await FriendRequest.create({
            sender: currentUser._id,
            receiver: friend._id,
            status: 'pending'
        });

        return res.status(201).json({
            request: friendRequest,
            relationshipStatus: 'outgoing_pending'
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to send friend request' });
    }
}

export const getFriendRequests = async(req: Request, res: Response) => {
    try {
        const currentUser = await findCurrentUser(req);

        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const incoming = await FriendRequest.find({
            receiver: currentUser._id,
            status: 'pending'
        })
            .populate('sender', 'username rank elo profilePicture')
            .sort({ createdAt: -1 });

        const outgoing = await FriendRequest.find({
            sender: currentUser._id,
            status: 'pending'
        })
            .populate('receiver', 'username rank elo profilePicture')
            .sort({ createdAt: -1 });

        return res.status(200).json({ incoming, outgoing });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to get friend requests' });
    }
}

export const acceptFriendRequest = async(req: Request, res: Response) => {
    try {
        const currentUser = await findCurrentUser(req);

        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const requestId = req.params.requestId;

        if (typeof requestId !== 'string' || !mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ error: 'Valid requestId is required' });
        }

        const friendRequest = await FriendRequest.findOne({
            _id: requestId,
            receiver: currentUser._id,
            status: 'pending'
        });

        if (!friendRequest) {
            return res.status(404).json({ error: 'Could not find pending friend request' });
        }

        friendRequest.status = 'accepted';

        await User.updateOne(
            { _id: currentUser._id },
            { $addToSet: { friends: friendRequest.sender } }
        );
        await User.updateOne(
            { _id: friendRequest.sender },
            { $addToSet: { friends: currentUser._id } }
        );
        await friendRequest.save();

        return res.status(200).json({ request: friendRequest });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to accept friend request' });
    }
}

export const removeFriend = async(req: Request, res: Response) => {
    try {
        const currentUser = await findCurrentUser(req);

        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const friendId = req.params.friendId;

        if (typeof friendId !== 'string' || !mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(400).json({ error: 'Valid friendId is required' });
        }

        if (String(currentUser._id) === friendId) {
            return res.status(400).json({ error: 'You cannot remove yourself as a friend' });
        }

        const friend = await User.findById(friendId).select('_id');

        if (!friend) {
            return res.status(404).json({ error: 'Could not find friend' });
        }

        const friendIds = Array.isArray(currentUser.friends) ? currentUser.friends : [];
        const areFriends = friendIds.some(existingFriendId => String(existingFriendId) === friendId);

        if (!areFriends) {
            return res.status(400).json({ error: 'User is not in your friends list' });
        }

        await User.updateOne(
            { _id: currentUser._id },
            { $pull: { friends: friend._id } }
        );
        await User.updateOne(
            { _id: friend._id },
            { $pull: { friends: currentUser._id } }
        );

        return res.status(200).json({ removedFriendId: friendId });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to remove friend' });
    }
}

export const declineFriendRequest = async(req: Request, res: Response) => {
    try {
        const currentUser = await findCurrentUser(req);

        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const requestId = req.params.requestId;

        if (typeof requestId !== 'string' || !mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ error: 'Valid requestId is required' });
        }

        const friendRequest = await FriendRequest.findOne({
            _id: requestId,
            receiver: currentUser._id,
            status: 'pending'
        });

        if (!friendRequest) {
            return res.status(404).json({ error: 'Could not find pending friend request' });
        }

        friendRequest.status = 'declined';
        await friendRequest.save();

        return res.status(200).json({ request: friendRequest });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to decline friend request' });
    }
}
