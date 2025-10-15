const mongoose = require('mongoose');
const { getConnections } = require('../config/db');
const { encrypt, decrypt } = require('../services/crypto.service');

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
        // This will store the ENCRYPTED code
    },
    status: {
        type: String,
        enum: ['Stopped', 'Running', 'Paused'],
        default: 'Stopped'
    },
    containerId: {
        type: String,
        default: null
    },
    broker: {
        type: String,
        enum: ['dhan', 'zerodha', 'upstox', 'angelone'],
        required: true,
        default: 'dhan'
    },
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Compound index to ensure unique strategy names per user
strategySchema.index({ userId: 1, name: 1 }, { unique: true });

// ============================================================
// ENCRYPTION HOOKS - Automatically encrypt/decrypt code
// ============================================================

// Before saving to database: ENCRYPT the code
strategySchema.pre('save', function(next) {
    // Only encrypt if code is modified or new
    if (this.isModified('code') && this.code) {
        // Check if already encrypted (contains ':' separator)
        if (!this.code.includes(':') || this.code.split(':').length !== 2) {
            console.log(`🔒 Encrypting code for strategy: ${this.name}`);
            this.code = encrypt(this.code);
        }
    }
    next();
});

// After retrieving from database: DECRYPT the code
strategySchema.post('find', function(docs) {
    if (docs && docs.length > 0) {
        docs.forEach(doc => {
            if (doc.code && doc.code.includes(':')) {
                try {
                    doc.code = decrypt(doc.code);
                } catch (error) {
                    console.error(`❌ Error decrypting code for strategy ${doc.name}:`, error.message);
                }
            }
        });
    }
});

// After retrieving a single document: DECRYPT the code
strategySchema.post('findOne', function(doc) {
    if (doc && doc.code && doc.code.includes(':')) {
        try {
            doc.code = decrypt(doc.code);
        } catch (error) {
            console.error(`❌ Error decrypting code for strategy ${doc.name}:`, error.message);
        }
    }
});

// After retrieving with findById: DECRYPT the code
strategySchema.post('findById', function(doc) {
    if (doc && doc.code && doc.code.includes(':')) {
        try {
            doc.code = decrypt(doc.code);
        } catch (error) {
            console.error(`❌ Error decrypting code for strategy ${doc.name}:`, error.message);
        }
    }
});

// Before updating: ENCRYPT the code if it's being updated
strategySchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.$set && update.$set.code) {
        // Check if already encrypted
        if (!update.$set.code.includes(':') || update.$set.code.split(':').length !== 2) {
            console.log(`🔒 Encrypting updated code`);
            update.$set.code = encrypt(update.$set.code);
        }
    } else if (update.code) {
        // Direct update without $set
        if (!update.code.includes(':') || update.code.split(':').length !== 2) {
            console.log(`🔒 Encrypting updated code`);
            update.code = encrypt(update.code);
        }
    }
    next();
});

// Function to get Strategy model with the correct connection
const getStrategyModel = () => {
    const { strategyConnection } = getConnections();
    if (!strategyConnection) {
        throw new Error('Strategy database connection not established');
    }
    return strategyConnection.model('Strategy', strategySchema);
};

module.exports = getStrategyModel;
