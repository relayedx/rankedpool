import mongoose from 'mongoose'

const matchReportSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    loser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending',
        required: true
    },
    gameType: {
        type: String,
        enum: ['8-ball', '9-ball', '10-ball'],
        required: true
    }
}, {timestamps: true})

export const MatchReport = mongoose.model('MatchReport', matchReportSchema);