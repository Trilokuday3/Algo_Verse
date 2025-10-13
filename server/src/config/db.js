const mongoose = require('mongoose');

// Connection URIs for three separate databases
const MONGO_USER_URI = process.env.MONGO_USER_URI;
const MONGO_STRATEGY_URI = process.env.MONGO_STRATEGY_URI;
const MONGO_CREDENTIALS_URI = process.env.MONGO_CREDENTIALS_URI;

// Create separate connections for different databases
let userConnection = null;
let strategyConnection = null;
let credentialsConnection = null;

const connectDB = async () => {
    try {
        // Validate environment variables
        if (!MONGO_USER_URI || !MONGO_STRATEGY_URI || !MONGO_CREDENTIALS_URI) {
            throw new Error('Missing MongoDB connection URIs in .env file. Please set MONGO_USER_URI, MONGO_STRATEGY_URI, and MONGO_CREDENTIALS_URI');
        }
        
        // Connect to user database
        userConnection = await mongoose.createConnection(MONGO_USER_URI);
        console.log("✓ User Database (user_db) connected successfully.");
        
        // Connect to strategy database
        strategyConnection = await mongoose.createConnection(MONGO_STRATEGY_URI);
        console.log("✓ Strategy Database (strategy_db) connected successfully.");
        
        // Connect to credentials database
        credentialsConnection = await mongoose.createConnection(MONGO_CREDENTIALS_URI);
        console.log("✓ Credentials Database (credentials_db) connected successfully.");
        
        console.log("🚀 All MongoDB databases connected successfully.");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        // Exit process with failure
        process.exit(1);
    }
};

// Export connections
const getConnections = () => ({
    userConnection,
    strategyConnection,
    credentialsConnection
});

module.exports = { connectDB, getConnections };
