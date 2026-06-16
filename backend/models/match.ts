import mongoose from 'mongoose'

const matchSchema = new mongoose.Schema({
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
  
    gameType: {
      type: String,
      enum: ['8-ball', '9-ball', '10-ball'],
      required: true
    },
  
    winnerEloBefore: {
      type: Number,
      required: true
    },
  
    winnerEloAfter: {
      type: Number,
      required: true
    },
  
    loserEloBefore: {
      type: Number,
      required: true
    },
  
    loserEloAfter: {
      type: Number,
      required: true
    },
  
    matchReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchReport'
    }
  }, { timestamps: true })
  
  export const Match = mongoose.model('Match', matchSchema);