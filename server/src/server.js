// 1. Load environment variables from .env file
require('dotenv').config();

// --- Dependencies ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dockerService = require('./services/docker.service');
const { connectDB } = require('./config/db');
const getUserModel = require('./models/User.model');
const getStrategyModel = require('./models/UserStrategy.model');
const getCredentialsModel = require('./models/Credentials.model');
const authMiddleware = require('./middleware/auth.middleware');
const { encrypt, decrypt } = require('./services/crypto.service');

// --- Constants & App Initialization ---
const JWT_SECRET = process.env.JWT_SECRET;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
const PORT = 3000;

// Initialize the docker service with our io instance
dockerService.init(io);

// --- Middleware ---
app.use(cors());
app.use(express.json());

// =================================================================
// --- API ROUTES ---
// =================================================================

// --- Authentication Route ---
app.post('/api/auth/login-or-register', async (req, res) => {
    try {
        const User = getUserModel();
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Please enter all fields.' });
        
        let user = await User.findOne({ email });
        if (user) { // Login
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Incorrect password.' });
        } else { // Register
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            user = new User({ email, password: hashedPassword });
            await user.save();
        }
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, message: 'Logged in successfully!' });
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({ message: 'Server error during authentication.' });
    }
});

// --- Credentials Route (Protected) ---
app.post('/api/credentials', authMiddleware, async (req, res) => {
    const { clientId, accessToken, brokerUsername, brokerPassword, totpSecret, broker, apiKey, apiSecret } = req.body;
    
    try {
        // Validate broker is provided
        if (!broker) {
            return res.status(400).json({ message: 'Broker selection is required.' });
        }
        
        // Validate broker is one of the allowed brokers
        const allowedBrokers = ['dhan', 'zerodha', 'upstox', 'angelone'];
        if (!allowedBrokers.includes(broker.toLowerCase())) {
            return res.status(400).json({ 
                message: `Invalid broker. Only ${allowedBrokers.join(', ')} are supported.` 
            });
        }
        
        // Normalize broker name to lowercase
        const normalizedBroker = broker.toLowerCase();
        
        const Credentials = getCredentialsModel();
        
        // Check if this broker already exists for user (will be updated)
        const existingBroker = await Credentials.findOne({ 
            userId: req.userId, 
            broker: normalizedBroker 
        });
        
        // If this is a NEW broker, check if user already has 4 brokers
        if (!existingBroker) {
            const userBrokerCount = await Credentials.countDocuments({ userId: req.userId });
            
            if (userBrokerCount >= 4) {
                return res.status(400).json({ 
                    message: 'Maximum 4 brokers allowed. Please delete an existing broker first.' 
                });
            }
        }
        
        // Prepare credential data with encryption
        const credentialData = {
            userId: req.userId,
            broker: normalizedBroker,
            clientId: clientId ? encrypt(clientId) : '',
            accessToken: accessToken ? encrypt(accessToken) : '',
            brokerUsername: brokerUsername ? encrypt(brokerUsername) : '',
            brokerPassword: brokerPassword ? encrypt(brokerPassword) : '',
            totpSecret: totpSecret ? encrypt(totpSecret) : '',
            apiKey: apiKey ? encrypt(apiKey) : '',
            apiSecret: apiSecret ? encrypt(apiSecret) : ''
        };
        
        // Upsert: update if broker exists for user, create if new broker
        await Credentials.findOneAndUpdate(
            { userId: req.userId, broker: normalizedBroker },
            credentialData,
            { upsert: true, new: true }
        );
        
        res.json({ 
            message: existingBroker 
                ? `${normalizedBroker} credentials updated successfully!` 
                : `${normalizedBroker} credentials saved successfully!` 
        });
    } catch (error) {
        console.error("Save credentials error:", error);
        res.status(500).json({ message: "Error saving credentials." });
    }
});

// Get all saved credentials for user
app.get('/api/credentials', authMiddleware, async (req, res) => {
    try {
        const Credentials = getCredentialsModel();
        const credentials = await Credentials.find({ userId: req.userId });
        
        // Decrypt for display (send back decrypted)
        const decryptedCredentials = credentials.map(cred => ({
            _id: cred._id,
            broker: cred.broker,
            clientId: cred.clientId ? decrypt(cred.clientId) : '',
            accessToken: cred.accessToken ? decrypt(cred.accessToken) : '',
            brokerUsername: cred.brokerUsername ? decrypt(cred.brokerUsername) : '',
            brokerPassword: cred.brokerPassword ? decrypt(cred.brokerPassword) : '',
            totpSecret: cred.totpSecret ? decrypt(cred.totpSecret) : '',
            apiKey: cred.apiKey ? decrypt(cred.apiKey) : '',
            apiSecret: cred.apiSecret ? decrypt(cred.apiSecret) : '',
            createdAt: cred.createdAt,
            updatedAt: cred.updatedAt
        }));
        
        res.json(decryptedCredentials);
    } catch (error) {
        console.error("Get credentials error:", error);
        res.status(500).json({ message: "Error fetching credentials." });
    }
});

// Delete a specific broker's credentials
app.delete('/api/credentials/:broker', authMiddleware, async (req, res) => {
    try {
        const Credentials = getCredentialsModel();
        const broker = req.params.broker;
        
        const deleted = await Credentials.findOneAndDelete({ 
            userId: req.userId, 
            broker: broker 
        });
        
        if (!deleted) {
            return res.status(404).json({ message: `No credentials found for ${broker}.` });
        }
        
        res.json({ message: `${broker} credentials deleted successfully.` });
    } catch (error) {
        console.error("Delete credentials error:", error);
        res.status(500).json({ message: "Error deleting credentials." });
    }
});

// --- Strategy Management Routes (Protected) ---
app.get('/api/strategies', authMiddleware, async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategies = await Strategy.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(strategies);
    } catch (error) {
        console.error("Get strategies error:", error);
        res.status(500).json({ message: 'Server error fetching strategies.' });
    }
});

app.post('/api/strategies', authMiddleware, async (req, res) => {
    const { name, code } = req.body;
    try {
        const Strategy = getStrategyModel();
        
        // Check if strategy with same name already exists for this user
        const existing = await Strategy.findOne({ userId: req.userId, name });
        if (existing) {
            return res.status(400).json({ message: 'A strategy with this name already exists.' });
        }
        
        const strategy = new Strategy({
            userId: req.userId,
            name,
            code
        });
        await strategy.save();
        
        const allStrategies = await Strategy.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.status(201).json({ message: 'Strategy saved successfully!', strategies: allStrategies });
    } catch (error) {
        console.error("Save strategy error:", error);
        res.status(500).json({ message: 'Error saving strategy.' });
    }
});

app.get('/api/strategies/:strategyId', authMiddleware, async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ _id: req.params.strategyId, userId: req.userId });
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        res.json(strategy);
    } catch (error) {
        console.error("Get strategy error:", error);
        res.status(500).json({ message: 'Server error fetching strategy.' });
    }
});

app.put('/api/strategies/:strategyId', authMiddleware, async (req, res) => {
    const { name, code, broker } = req.body;
    
    console.log('=== UPDATE STRATEGY (server.js route) ===');
    console.log('Received broker:', broker);
    console.log('Received name:', name);
    
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ _id: req.params.strategyId, userId: req.userId });
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });

        console.log('Current strategy broker:', strategy.broker);

        // Check if another strategy with the new name already exists
        if (name !== strategy.name) {
            const existing = await Strategy.findOne({ userId: req.userId, name, _id: { $ne: req.params.strategyId } });
            if (existing) {
                return res.status(400).json({ message: 'Another strategy with this name already exists.' });
            }
        }
        
        // Handle broker update
        if (broker && broker.toLowerCase() !== strategy.broker.toLowerCase()) {
            console.log('Broker is changing from', strategy.broker, 'to', broker);
            
            const Credentials = getCredentialsModel();
            const credentials = await Credentials.findOne({ 
                userId: req.userId, 
                broker: broker.toLowerCase() 
            });
            
            if (!credentials) {
                console.log('No credentials found for broker:', broker);
                return res.status(400).json({ 
                    message: `No credentials found for ${broker}. Please add credentials first.` 
                });
            }
            
            console.log('Credentials found, updating broker to:', broker.toLowerCase());
            strategy.broker = broker.toLowerCase();
        } else if (broker) {
            console.log('Broker not changing or same broker selected');
            strategy.broker = broker.toLowerCase();
        }
        
        strategy.name = name;
        strategy.code = code;
        
        console.log('Saving strategy with broker:', strategy.broker);
        await strategy.save();
        
        console.log('Strategy saved. Final broker:', strategy.broker);
        res.json({ message: 'Strategy updated successfully!', strategy });
    } catch (error) {
        console.error("Update strategy error:", error);
        res.status(500).json({ message: 'Error updating strategy.' });
    }
});

app.delete('/api/strategies/:strategyId', authMiddleware, async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        await Strategy.findOneAndDelete({ _id: req.params.strategyId, userId: req.userId });
        const strategies = await Strategy.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json({ message: 'Strategy deleted successfully!', strategies });
    } catch (error) {
        console.error("Delete strategy error:", error);
        res.status(500).json({ message: 'Error deleting strategy.' });
    }
});

app.post('/api/strategies/:strategyId/start', authMiddleware, async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const Credentials = getCredentialsModel();
        
        const strategy = await Strategy.findOne({ _id: req.params.strategyId, userId: req.userId });
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        if (strategy.containerId) await dockerService.stopStrategyContainer(strategy.containerId);
        
        // Get credentials from credentials database
        const credentials = await Credentials.findOne({ userId: req.userId });
        if (!credentials || !credentials.clientId || !credentials.accessToken) {
            return res.status(400).json({ message: 'Please configure your broker credentials first.' });
        }
        
        const decryptedClientId = decrypt(credentials.clientId);
        const decryptedAccessToken = decrypt(credentials.accessToken);
        
        const containerId = await dockerService.startStrategyContainer(strategy, decryptedClientId, decryptedAccessToken);
        strategy.status = 'Running';
        strategy.containerId = containerId;
        await strategy.save();
        
        res.json({ success: true, message: `${strategy.name} has been started.` });
    } catch (error) {
        console.error("Error starting strategy:", error);
        res.status(500).json({ message: 'Error starting strategy.' });
    }
});

app.post('/api/strategies/:strategyId/stop', authMiddleware, async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ _id: req.params.strategyId, userId: req.userId });
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        if (strategy.containerId) await dockerService.stopStrategyContainer(strategy.containerId);
        strategy.status = 'Stopped';
        strategy.containerId = null;
        await strategy.save();
        res.json({ success: true, message: `${strategy.name} has been stopped.` });
    } catch (error) {
        console.error("Error stopping strategy:", error);
        res.status(500).json({ message: 'Error stopping strategy.' });
    }
});

app.post('/api/strategies/:strategyId/pause', authMiddleware, async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ _id: req.params.strategyId, userId: req.userId });
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        strategy.status = 'Paused';
        await strategy.save();
        res.json({ success: true, message: `${strategy.name} has been paused.` });
    } catch (error) {
        console.error("Error pausing strategy:", error);
        res.status(500).json({ message: 'Error pausing strategy.' });
    }
});

app.post('/api/strategies/:strategyId/resume', authMiddleware, async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ _id: req.params.strategyId, userId: req.userId });
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        strategy.status = 'Running';
        await strategy.save();
        res.json({ success: true, message: `${strategy.name} has been resumed.` });
    } catch (error) {
        console.error("Error resuming strategy:", error);
        res.status(500).json({ message: 'Error resuming strategy.' });
    }
});

// --- Run Code From Terminal (Protected) ---
app.post('/api/run', authMiddleware, async (req, res) => {
    try {
        const { code, broker } = req.body;
        
        // Validate broker parameter
        if (!broker) {
            return res.status(400).json({ output: 'Error: Broker not specified. Please select a broker.' });
        }
        
        const allowedBrokers = ['dhan', 'zerodha', 'upstox', 'angelone'];
        if (!allowedBrokers.includes(broker.toLowerCase())) {
            return res.status(400).json({ output: 'Error: Invalid broker selected.' });
        }
        
        const Credentials = getCredentialsModel();
        const credentials = await Credentials.findOne({ 
            userId: req.userId,
            broker: broker.toLowerCase()
        });
        
        if (!credentials || !credentials.clientId || !credentials.accessToken) {
            return res.status(400).json({ output: `Error: No credentials found for ${broker}. Please add credentials first.` });
        }
        
        const decryptedClientId = decrypt(credentials.clientId);
        const decryptedAccessToken = decrypt(credentials.accessToken);
        const output = await dockerService.runPythonCode(code, decryptedClientId, decryptedAccessToken, broker.toLowerCase());
        res.json({ output });
    } catch (error) {
        console.error("Run code error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Dashboard Data Route (Protected) ---
app.get('/api/dashboard', authMiddleware, async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const Credentials = getCredentialsModel();
        
        const credentials = await Credentials.findOne({ userId: req.userId });
        if (!credentials || !credentials.clientId || !credentials.accessToken) {
            return res.status(400).json({ message: 'Broker credentials not set.' });
        }
        
        const decryptedClientId = decrypt(credentials.clientId);
        const decryptedAccessToken = decrypt(credentials.accessToken);
        const pythonScript = `
import json, sys
try:
    funds = tsl.get_funds()
    positions = tsl.get_positions()
    dashboard_data = {"funds": funds, "positions": positions}
    print(json.dumps(dashboard_data))
except Exception as e:
    print(json.dumps({"error": str(e)}))
finally:
    sys.stdout.flush()
`;
        const rawOutput = await dockerService.runPythonCode(pythonScript, decryptedClientId, decryptedAccessToken);
        const jsonOutput = rawOutput.substring(rawOutput.indexOf('{'));
        const brokerData = JSON.parse(jsonOutput);
        
        // Get strategy count from strategy database
        const strategiesCount = await Strategy.countDocuments({ userId: req.userId });
        
        const responsePayload = {
            brokerData: brokerData,
            activeStrategies: strategiesCount
        };
        res.json(responsePayload);
    } catch (error) {
        console.error("Dashboard data error:", error);
        res.status(500).json({ message: "Error fetching dashboard data." });
    }
});
// =================================================================
// --- USER PROFILE ROUTES (Protected) ---
// =================================================================

// Get user profile
app.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const User = getUserModel();
        const Strategy = getStrategyModel();
        const Credentials = getCredentialsModel();

        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        
        // Get strategies from strategy database
        const strategies = await Strategy.find({ userId: req.userId });
        
        // Get all broker credentials from credentials database
        const allCredentials = await Credentials.find({ userId: req.userId });
        
        // Map credentials to show which brokers are configured
        const brokerStatus = allCredentials.map(cred => ({
            broker: cred.broker,
            hasClientId: !!cred.clientId,
            hasAccessToken: !!cred.accessToken,
            hasBrokerUsername: !!cred.brokerUsername,
            hasBrokerPassword: !!cred.brokerPassword,
            hasTotpSecret: !!cred.totpSecret,
            hasApiKey: !!cred.apiKey,
            hasApiSecret: !!cred.apiSecret,
            updatedAt: cred.updatedAt
        }));
        
        // Return profile with all broker information
        const profile = {
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            createdAt: user._id.getTimestamp(), // MongoDB ObjectId contains creation timestamp
            strategies: strategies,
            brokers: brokerStatus, // Array of all configured brokers
            brokerCount: allCredentials.length, // How many brokers configured (max 4)
            maxBrokers: 4 // Maximum allowed
        };
        
        res.json(profile);
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: 'Error fetching profile.' });
    }
});

// Update user profile
app.put('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body;
        
        const User = getUserModel();
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        
        // Update only the fields that are provided
        if (firstName !== undefined) user.firstName = firstName.trim();
        if (lastName !== undefined) user.lastName = lastName.trim();
        if (phone !== undefined) user.phone = phone.trim();
        
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully!',
            profile: {
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ success: false, message: 'Error updating profile.' });
    }
});

// Change password
app.post('/api/user/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide both current and new password.' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
        }
        
        const User = getUserModel();
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        
        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
        
        // Hash and save new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.json({ success: true, message: 'Password changed successfully!' });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ success: false, message: 'Error changing password.' });
    }
});

// Delete account
app.delete('/api/user/delete', authMiddleware, async (req, res) => {
    try {
        const User = getUserModel();
        const Strategy = getStrategyModel();
        const Credentials = getCredentialsModel();

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        
        // Get all user strategies from strategy database
        const strategies = await Strategy.find({ userId: req.userId });
        
        // Stop all running strategies before deleting
        for (const strategy of strategies) {
            if (strategy.containerId) {
                try {
                    await dockerService.stopStrategyContainer(strategy.containerId);
                } catch (err) {
                    console.error(`Error stopping container ${strategy.containerId}:`, err);
                }
            }
        }
        
        // Delete from all three databases
        await User.findByIdAndDelete(req.userId);
        await Strategy.deleteMany({ userId: req.userId });
        await Credentials.deleteOne({ userId: req.userId });
        
        res.json({ message: 'Account deleted successfully.' });
    } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ message: 'Error deleting account.' });
    }
});

// =================================================================
// --- WebSocket Logic ---
// =================================================================
io.on('connection', (socket) => {
    console.log('A user connected with socket ID:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});


// =================================================================
// --- Server Startup ---
// =================================================================
async function startServer() {
    try {
        await connectDB();
        await dockerService.buildImage();
        server.listen(PORT, () => {
            console.log(`Server is listening on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
}

startServer();

