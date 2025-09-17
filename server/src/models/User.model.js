const mongoose = require('mongoose');

// Create a blueprint for a single strategy
const strategySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true
    }
});

const userSchema = new mongoose.Schema({
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
    clientId: {
        type: String,
        default: ''
    },
    accessToken: {
        type: String,
        default: ''
    },
    // Add an array to hold the user's strategies
    strategies: [strategySchema]
});

const User = mongoose.model('User', userSchema);

module.exports = User;