const mongoose = require('mongoose');

// IMPORTANT: Replace with your actual connection string from MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB connected successfully.");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;