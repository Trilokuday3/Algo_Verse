const mongoose = require('mongoose');

// This defines the structure for a single saved strategy.
// It is used as a "sub-document" within the main user schema.
const strategySchema = new mongoose.Schema({
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
        enum: ['Stopped', 'Running', 'Paused'], // The status can only be one of these three values.
        default: 'Stopped' // New strategies will always default to 'Stopped'.
    },
    // In a real multi-run system, you would store the container ID here to manage the process.
    containerId: { 
        type: String, 
        default: null 
    } 
});

// This is the main blueprint for a user in your database.
const userSchema = new mongoose.Schema({
    // Core user authentication fields
    email: {
        type: String,
        required: true,
        unique: true, // No two users can have the same email.
        lowercase: true // Store emails in lowercase to avoid case-sensitivity issues.
    },
    password: {
        type: String,
        required: true // This will store the securely hashed password.
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
    
    // Encrypted credentials for the automated daily login feature
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

    // An array that will hold all of the user's saved strategies.
    strategies: [strategySchema]
});

// Create the model from the schema, which allows us to interact with the 'users' collection in MongoDB.
const User = mongoose.model('User', userSchema);

module.exports = User;

