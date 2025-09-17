const mongoose = require('mongoose');

// --- IMPORTANT ---
// PASTE YOUR MONGODB ATLAS CONNECTION STRING HERE
const MONGO_URI = "mongodb+srv://Cap_Manager:algoverse@3lok.5802e.mongodb.net/Capstone_Project?retryWrites=true&w=majority&appName=3Lok";

// A simple schema for our test
const testSchema = new mongoose.Schema({
  name: String,
  createdAt: { type: Date, default: Date.now }
});

const Test = mongoose.model('Test', testSchema);

// The main function to run our test
async function runTest() {
  console.log("Attempting to connect to MongoDB Atlas...");
  try {
    // 1. Connect to the database
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully.");

    // 2. Create a new test document
    const testDoc = new Test({ name: 'Connection Test' });
    console.log("Attempting to save a test document...");

    // 3. Save the document to the database
    await testDoc.save();
    console.log("Test document saved successfully!");

  } catch (error) {
    console.error("\n--- DATABASE CONNECTION FAILED ---");
    console.error("This is the detailed error message:");
    console.error(error);
    console.error("---------------------------------");
  } finally {
    // 4. Close the connection
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

// Run the test
runTest();