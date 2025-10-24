const mongoose = require('mongoose');
const { getConnections } = require('../config/db');

// Strategy Run History schema
const strategyRunSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    strategyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, // Optional - can run without saving strategy
        index: true
    },
    strategyName: {
        type: String,
        required: true,
        trim: true
    },
    broker: {
        type: String,
        enum: ['dhan', 'zerodha', 'upstox', 'angelone'],
        required: true
    },
    terminalOutput: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['running', 'success', 'error', 'stopped'],
        required: true
    },
    executionTime: {
        type: Number, // milliseconds
        required: false
    },
    stopTime: {
        type: Date,
        required: false
    },
    errorMessage: {
        type: String,
        required: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Indexes for faster queries
strategyRunSchema.index({ userId: 1, createdAt: -1 });
strategyRunSchema.index({ strategyId: 1, createdAt: -1 });

// Get the StrategyRun model
function getStrategyRunModel() {
    const { strategyConnection } = getConnections();
    return strategyConnection.model('StrategyRun', strategyRunSchema);
}

module.exports = { getStrategyRunModel };
