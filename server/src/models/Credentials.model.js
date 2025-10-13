const mongoose = require('mongoose');
const { getConnections } = require('../config/db');

// Credentials schema for storing encrypted API keys and broker credentials
const credentialsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true, // One credentials document per user
        index: true
    },
    
    // Broker selection
    broker: {
        type: String,
        enum: ['dhan', 'zerodha', 'upstox', 'angelone', 'fyers', 'other'],
        default: 'dhan'
    },
    
    // Encrypted credentials for running strategies
    clientId: {
        type: String,
        default: ''
    },
    accessToken: {
        type: String,
        default: ''
    },
    
    // Encrypted credentials for automated daily login
    brokerUsername: {
        type: String,
        default: ''
    },
    brokerPassword: {
        type: String,
        default: ''
    },
    totpSecret: {
        type: String,
        default: ''
    },
    
    // Additional API keys or tokens (extensible for future brokers)
    apiKey: {
        type: String,
        default: ''
    },
    apiSecret: {
        type: String,
        default: ''
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Function to get Credentials model with the correct connection
const getCredentialsModel = () => {
    const { credentialsConnection } = getConnections();
    if (!credentialsConnection) {
        throw new Error('Credentials database connection not established');
    }
    return credentialsConnection.model('Credentials', credentialsSchema);
};

module.exports = getCredentialsModel;
