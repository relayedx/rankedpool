import { User } from '../models/user'
import { MatchReport } from '../models/matchReport'
import { getAuth } from '@clerk/express'
import { Request, Response } from 'express'
import { Match } from '../models/match'

export const createMatchReport = async (req: Request, res: Response) => {
    try {
        // validate req
        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // find sender
        const sender = await User.findOne({ clerkId: userId });
        const { username, didWin, gameType} = req.body;
        
        // validate values
        if (!username || !gameType) {
            return res.status(400).json({ error: 'missing fields' });
        }

        if (typeof username !== 'string') {
            return res.status(400).json({ error: 'username must be a string' });
        }

        const lowercaseUsername = username.toLowerCase().trim();

        if (typeof didWin !== 'boolean') {
            return res.status(400).json({ error: 'didWin must be true or false' });
        }

        const receiver = await User.findOne({ username: lowercaseUsername});

        // check if User documents found
        if (!sender || !receiver) {
            return res.status(404).json({ error: 'Could not find user' });
        } 

        // make sure user didnt enter their own username
        if (sender._id.equals(receiver._id)) {
            return res.status(400).json({ error: 'Cannot create MatchReport against yourself' });
        }

        // if either users already have an existing MatchReport w/ pending status, return error
        const receiverExistingMatchReport = await MatchReport.findOne({
            receiver: receiver._id,
            status: 'pending'
        });

        const senderExistingMatchReport = await MatchReport.findOne({
            receiver: sender._id,
            status: 'pending'
        });

        if (receiverExistingMatchReport || senderExistingMatchReport) {
            return res.status(400).json({ error: 'Existing pending match report for sender or receiver' });
        }

        const newMatchReport = await MatchReport.create({
            sender: sender._id,
            receiver: receiver._id,
            winner: didWin ? sender._id : receiver._id,
            loser: didWin ? receiver._id : sender._id,
            status: 'pending',
            gameType: gameType
        });

        return res.status(201).json({ newMatchReport });

    } catch (error) {
        return res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to create MatchReport' 
        });
    }
}

export const getPendingMatchReport = async (req: Request, res: Response) => {
    try {
        // validate req
        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // find User document that req came from
        const currUser = await User.findOne({ clerkId: userId });
        if (!currUser) {
            return res.status(401).json({ error: 'Could not find user' });
        }

        // find the current pending MatchReport for user (if any)
        const pendingMatchReport = await MatchReport.findOne({ 
            receiver: currUser._id,
            status: 'pending'
        }).populate('sender', 'username profilePicture rank elo');

        if (!pendingMatchReport) {
            return res.status(200).json({ matchReport: null });
        }
        
        return res.status(200).json({ 
            matchReport: pendingMatchReport
        });

    } catch (error) {
        return res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to get pending MatchReports' 
        });
    }
}

// function to get the value of the users curr rank; used to compare ranks w/ one another
const ranks = ['iron', 'bronze', 'silver', 'gold', 'diamond'] as const;
const getRankValue = (rank: string) => {
    return ranks.indexOf(rank as typeof ranks[number]);
}

// handle for rankup
const rankUpUser = (user: any) => {
    const currentRankIndex = getRankValue(user.rank);

    if (currentRankIndex === -1) {
        return;
    }

    const nextRankIndex = currentRankIndex + 1;
    if (nextRankIndex < ranks.length) {
        user.rank = ranks[nextRankIndex];
        user.elo = 0;
    }
}

// handle derank
const deRankUser = (user: any) => {
    const currentRankIndex = getRankValue(user.rank);

    if (currentRankIndex === -1) {
        return;
    }

    const prevRankIndex = currentRankIndex - 1;
    if (prevRankIndex >= 0 ) {
        user.rank = ranks[prevRankIndex];
        user.elo = 80;
    } else {
        user.elo = 0;
    }
}

// handling for accepting a MatchReport
export const acceptMatchReport = async (req: Request, res: Response) => {
    try {
        // validate req
        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // get current user req was made from
        const currUser = await User.findOne({ clerkId: userId });
        if (!currUser) {
            return res.status(401).json({ error: 'Cannot find User' });
        }

        // find matchReport that user is accepting
        const { matchReportId } = req.params;
        if (!matchReportId) {
            return res.status(400).json({ error: 'matchReportId is required' });
        }
        const acceptedMatchReport = await MatchReport.findOne({
            _id: matchReportId,
            status: 'pending'
        });
        if (!acceptedMatchReport) {
            return  res.status(400).json({ error: 'Cannot find match report' });
        }

        // verify that the user is the receiver of this MatchReport
        if (!acceptedMatchReport.receiver.equals(currUser._id)) {
            return res.status(403).json({ error: 'User is not authorized to accept this match report' });
        }

        // find the User documents of the winnner and loser
        const winner = await User.findOne({ _id: acceptedMatchReport.winner });
        const loser = await User.findOne({ _id: acceptedMatchReport.loser });
        if (!winner || !loser) {
            return res.status(400).json({ error: 'Cannot find user' });
        }

        // handle the elo change for both winner and loser
        const winnerEloBefore = winner.elo;
        const loserEloBefore = loser.elo;
        const winnerRankValue = getRankValue(winner.rank);
        const loserRankValue = getRankValue(loser.rank);
        let winnerEloChange = 0;
        let loserEloChange = 0;

        if (winnerRankValue !== -1 && loserRankValue !== -1) {
            if (winnerRankValue < loserRankValue) {
                winnerEloChange = 30;
                loserEloChange = 15;
            } else {
                winnerEloChange = 20;
                loserEloChange = 10;
            }
        }

        // add elo change to users elo;
        loser.elo -= loserEloChange;
        winner.elo += winnerEloChange;

        // check if there is a rank up or derank after elo change
        if (winner.elo >= 100) {
            rankUpUser(winner);
        }

        if (loser.elo < 0) {
            deRankUser(loser);
        }

        const newMatch = await Match.create({
            winner: winner._id,
            loser: loser._id,
            gameType: acceptedMatchReport.gameType,
            winnerEloBefore,
            winnerEloAfter: winner.elo,
            loserEloBefore,
            loserEloAfter: loser.elo,
            matchReport: acceptedMatchReport._id
        })
        
        // change the status of the MatchReport to accepted
        acceptedMatchReport.status = 'accepted';

        await winner.save();
        await loser.save();
        await acceptedMatchReport.save();

        return res.status(201).json({
            match: newMatch,
            winner,
            loser,
            matchReport: acceptedMatchReport
        });
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to accept match report'
        });
    }
}

// handling for declining a MatchReport
export const declineMatchReport = async (req: Request, res: Response) => {
    try {
        // validate req
        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // get current user req was made from
        const currUser = await User.findOne({ clerkId: userId });
        if (!currUser) {
            return res.status(404).json({ error: 'Cannot find User' });
        }

        // find matchReport that user is accepting
        const { matchReportId } = req.params;
        if (!matchReportId) {
            return res.status(400).json({ error: 'matchReportId is required' });
        }
        const declinedMatchReport = await MatchReport.findOne({
            _id: matchReportId,
            status: 'pending'
        });
        if (!declinedMatchReport) {
            return  res.status(404).json({ error: 'Cannot find match report' });
        }

        // verify that the user is the receiver of this MatchReport
        if (!declinedMatchReport.receiver.equals(currUser._id)) {
            return res.status(403).json({ error: 'User is not authorized to decline this match report' });
        }

        declinedMatchReport.status = 'declined';
        await declinedMatchReport.save();

        return res.status(200).json({ matchReport: declinedMatchReport });

    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to decline match report'
        });
    }
}