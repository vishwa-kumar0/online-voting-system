const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    voterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voter',
        required: true
    },
    candidate: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
voteSchema.index({ voterId: 1 });
voteSchema.index({ candidate: 1 });

module.exports = mongoose.model('Vote', voteSchema);