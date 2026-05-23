import mongoose from 'mongoose'

export type Rank = 'bronze' | 'iron' | 'silver' | 'gold' | 'diamond'

const userSchema = new mongoose.Schema({
    auth0Id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'email is invalid']
    },
    username: {
        type: String,
        required:[true, 'a unique username is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-zA-Z0-9_]+$/, 'username is invalid']
    },
    rank: {
        type: String,
        enum: ['bronze', 'iron', 'silver', 'gold', 'diamond'],
        default: 'bronze'
    },
    elo: {
        type: Number,
        default: 0
    },
    matchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:'Match'
        }
    ],
    profilePicture: {
        type: String
    }

}, {timestamps: true})

export const User = mongoose.model('User', userSchema);