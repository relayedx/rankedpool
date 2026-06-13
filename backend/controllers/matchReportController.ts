import { User } from '../models/user'
import { MatchReport } from '../models/matchReport'
import { getAuth } from '@clerk/express'
import { Request, Response } from 'express'

export const createMatchReport = async (req: Request, res: Response) => {
    try {
        // validate req
        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        // find sender
        const sender = await User.findOne({ clerkId: userId });
        const { username, didWin, gameType} = req.body;
        
        // validate values
        if (!username || !gameType) {
            return res.status(400).json({ error: 'missing fields' })
        }

        if (typeof username !== 'string') {
            return res.status(400).json({ error: 'username must be a string' });
          }

        const lowercaseUsername = username.toLowerCase().trim();

        if (typeof didWin !== 'boolean') {
            return res.status(400).json({ error: 'didWin must be true or false' })
        }

        const receiver = await User.findOne({ username: lowercaseUsername});

        // check if User documents found
        if (!sender || !receiver) {
            return res.status(404).json({ error: 'could not find user' });
        } 

        // make sure user didnt enter their own username
        if (sender._id.equals(receiver._id)) {
            return res.status(400).json({ error: 'cannot create MatchReport against yourself' })
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
            return res.status(400).json({ error: 'existing pending match report for sender or receiver' });
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
            error: error instanceof Error ? error.message : 'failed to create MatchReport' 
        })
    }
}

