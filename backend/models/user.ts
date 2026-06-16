import mongoose from 'mongoose'

export type Rank = 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond'

const userSchema = new mongoose.Schema({
    clerkId: {
        type: String,
        required: true,
        unique: true
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
        enum: ['iron', 'bronze', 'silver', 'gold', 'diamond'],
        default: 'iron'
    },
    elo: {
        type: Number,
        default: 0
    },
    profilePicture: {
        type: String,
        default: 'images/default-profile-pic.png'
    }

}, {timestamps: true})

export const User = mongoose.model('User', userSchema);