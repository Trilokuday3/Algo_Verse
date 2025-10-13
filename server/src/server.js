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
    const { clientId, accessToken, brokerUsername, brokerPassword, totpSecret, broker } = req.body;
    try {
        const Credentials = getCredentialsModel();
        const updates = { userId: req.userId };
        
        if (broker) updates.broker = broker;
        if (clientId) updates.clientId = encrypt(clientId);
        if (accessToken) updates.accessToken = encrypt(accessToken);
        if (brokerUsername) updates.brokerUsername = encrypt(brokerUsername);
        if (brokerPassword) updates.brokerPassword = encrypt(brokerPassword);
        if (totpSecret) updates.totpSecret = encrypt(totpSecret);
        
        // Upsert: update if exists, create if doesn't
        await Credentials.findOneAndUpdate(
            { userId: req.userId },
            updates,
            { upsert: true, new: true }
        );
        
        res.json({ message: 'Credentials saved securely!' });
    } catch (error) {
        console.error("Save credentials error:", error);
        res.status(500).json({ message: "Error saving credentials." });
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
    const { name, code } = req.body;
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ _id: req.params.strategyId, userId: req.userId });
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });

        // Check if another strategy with the new name already exists
        if (name !== strategy.name) {
            const existing = await Strategy.findOne({ userId: req.userId, name, _id: { $ne: req.params.strategyId } });
            if (existing) {
                return res.status(400).json({ message: 'Another strategy with this name already exists.' });
            }
        }
        
        strategy.name = name;
        strategy.code = code;
        await strategy.save();
        
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
        const { code } = req.body;
        const Credentials = getCredentialsModel();
        const credentials = await Credentials.findOne({ userId: req.userId });
        
        if (!credentials || !credentials.clientId || !credentials.accessToken) {
            return res.status(400).json({ output: 'Error: Broker credentials not set.' });
        }
        
        const decryptedClientId = decrypt(credentials.clientId);
        const decryptedAccessToken = decrypt(credentials.accessToken);
        const output = await dockerService.runPythonCode(code, decryptedClientId, decryptedAccessToken);
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
        
        // Get credentials from credentials database
        const credentials = await Credentials.findOne({ userId: req.userId });
        
        // Return profile with masked credential status
        const profile = {
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            createdAt: user._id.getTimestamp(), // MongoDB ObjectId contains creation timestamp
            strategies: strategies,
            hasClientId: !!(credentials?.clientId),
            hasAccessToken: !!(credentials?.accessToken),
            hasBrokerUsername: !!(credentials?.brokerUsername),
            hasBrokerPassword: !!(credentials?.brokerPassword),
            hasTotpSecret: !!(credentials?.totpSecret)
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

