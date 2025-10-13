const mongoose = require('mongoose');
const { getConnections } = require('../config/db');

// Strategy schema for storing user strategies
const strategySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true // Index for faster queries by userId
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Stopped', 'Running', 'Paused'],
        default: 'Stopped'
    },
    containerId: {
        type: String,
        default: null
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Compound index to ensure unique strategy names per user
strategySchema.index({ userId: 1, name: 1 }, { unique: true });

// Function to get Strategy model with the correct connection
const getStrategyModel = () => {
    const { strategyConnection } = getConnections();
    if (!strategyConnection) {
        throw new Error('Strategy database connection not established');
    }
    return strategyConnection.model('Strategy', strategySchema);
};

module.exports = getStrategyModel;
