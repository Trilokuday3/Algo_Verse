const mongoose = require('mongoose');
const { getConnections } = require('../config/db');

// This is the user schema for authentication and profile information only
const userSchema = new mongoose.Schema({
    // Core user authentication fields
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    
    // Profile information
    firstName: {
        type: String,
        default: '',
        trim: true
    },
    lastName: {
        type: String,
        default: '',
        trim: true
    },
    phone: {
        type: String,
        default: '',
        trim: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Function to get User model with the correct connection
const getUserModel = () => {
    const { userConnection } = getConnections();
    if (!userConnection) {
        throw new Error('User database connection not established');
    }
    return userConnection.model('User', userSchema);
};

module.exports = getUserModel;


