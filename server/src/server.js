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
const connectDB = require('./config/db');
const User = require('./models/User.model');
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
    const { clientId, accessToken, brokerUsername, brokerPassword, totpSecret } = req.body;
    try {
        const updates = {};
        if (clientId) updates.clientId = encrypt(clientId);
        if (accessToken) updates.accessToken = encrypt(accessToken);
        if (brokerUsername) updates.brokerUsername = encrypt(brokerUsername);
        if (brokerPassword) updates.brokerPassword = encrypt(brokerPassword);
        if (totpSecret) updates.totpSecret = encrypt(totpSecret);
        await User.findByIdAndUpdate(req.userId, updates);
        res.json({ message: 'Credentials saved securely!' });
    } catch (error) {
        res.status(500).json({ message: "Error saving credentials." });
    }
});

// --- Strategy Management Routes (Protected) ---
app.get('/api/strategies', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('strategies');
        res.json(user.strategies);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching strategies.' });
    }
});

app.post('/api/strategies', authMiddleware, async (req, res) => {
    const { name, code } = req.body;
    try {
        const user = await User.findById(req.userId);
        if (user.strategies.some(s => s.name === name)) {
            return res.status(400).json({ message: 'A strategy with this name already exists.' });
        }
        user.strategies.push({ name, code });
        await user.save();
        res.status(201).json({ message: 'Strategy saved successfully!', strategies: user.strategies });
    } catch (error) {
        res.status(500).json({ message: 'Error saving strategy.' });
    }
});

app.get('/api/strategies/:strategyId', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const strategy = user.strategies.id(req.params.strategyId);
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        res.json(strategy);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching strategy.' });
    }
});

app.put('/api/strategies/:strategyId', authMiddleware, async (req, res) => {
    const { name, code } = req.body;
    try {
        const user = await User.findById(req.userId);
        const strategy = user.strategies.id(req.params.strategyId);
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });

        if (name !== strategy.name && user.strategies.some(s => s.name === name)) {
            return res.status(400).json({ message: 'Another strategy with this name already exists.' });
        }
        strategy.name = name;
        strategy.code = code;
        await user.save();
        res.json({ message: 'Strategy updated successfully!', strategy });
    } catch (error) {
        res.status(500).json({ message: 'Error updating strategy.' });
    }
});

app.delete('/api/strategies/:strategyId', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        user.strategies.pull({ _id: req.params.strategyId });
        await user.save();
        res.json({ message: 'Strategy deleted successfully!', strategies: user.strategies });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting strategy.' });
    }
});

app.post('/api/strategies/:strategyId/start', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const strategy = user.strategies.id(req.params.strategyId);
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        if (strategy.containerId) await dockerService.stopStrategyContainer(strategy.containerId);
        
        const decryptedClientId = decrypt(user.clientId);
        const decryptedAccessToken = decrypt(user.accessToken);
        
        const containerId = await dockerService.startStrategyContainer(strategy, decryptedClientId, decryptedAccessToken);
        strategy.status = 'Running';
        strategy.containerId = containerId;
        await user.save();
        res.json({ message: `${strategy.name} has been started.` });
    } catch (error) {
        console.error("Error starting strategy:", error);
        res.status(500).json({ message: 'Error starting strategy.' });
    }
});

app.post('/api/strategies/:strategyId/stop', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const strategy = user.strategies.id(req.params.strategyId);
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        if (strategy.containerId) await dockerService.stopStrategyContainer(strategy.containerId);
        strategy.status = 'Stopped';
        strategy.containerId = null;
        await user.save();
        res.json({ message: `${strategy.name} has been stopped.` });
    } catch (error) {
        res.status(500).json({ message: 'Error stopping strategy.' });
    }
});

app.post('/api/strategies/:strategyId/pause', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const strategy = user.strategies.id(req.params.strategyId);
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        strategy.status = 'Paused';
        await user.save();
        res.json({ message: `${strategy.name} has been paused.` });
    } catch (error) {
        res.status(500).json({ message: 'Error pausing strategy.' });
    }
});

app.post('/api/strategies/:strategyId/resume', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const strategy = user.strategies.id(req.params.strategyId);
        if (!strategy) return res.status(404).json({ message: 'Strategy not found.' });
        strategy.status = 'Running';
        await user.save();
        res.json({ message: `${strategy.name} has been resumed.` });
    } catch (error) {
        res.status(500).json({ message: 'Error resuming strategy.' });
    }
});

// --- Run Code From Terminal (Protected) ---
app.post('/api/run', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.userId);
        if (!user || !user.clientId || !user.accessToken) {
            return res.status(400).json({ output: 'Error: Broker credentials not set.' });
        }
        const decryptedClientId = decrypt(user.clientId);
        const decryptedAccessToken = decrypt(user.accessToken);
        const output = await dockerService.runPythonCode(code, decryptedClientId, decryptedAccessToken);
        res.json({ output });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Dashboard Data Route (Protected) ---
app.get('/api/dashboard', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || !user.clientId || !user.accessToken) {
            return res.status(400).json({ message: 'Broker credentials not set.' });
        }
        const decryptedClientId = decrypt(user.clientId);
        const decryptedAccessToken = decrypt(user.accessToken);
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
        const responsePayload = {
            brokerData: brokerData,
            activeStrategies: user.strategies.length
        };
        res.json(responsePayload);
    } catch (error) {
        console.error("Dashboard data error:", error);
        res.status(500).json({ message: "Error fetching dashboard data." });
    }
});

// --- NEW: Protected Route to Get Dashboard Data ---
app.get('/api/dashboard', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || !user.clientId || !user.accessToken) {
            return res.status(400).json({ message: 'Broker credentials not set.' });
        }

        const decryptedClientId = decrypt(user.clientId);
        const decryptedAccessToken = decrypt(user.accessToken);

        const pythonScript = `
import json
try:
    funds = tsl.get_funds()
    positions = tsl.get_positions()
    dashboard_data = {"funds": funds, "positions": positions}
    print(json.dumps(dashboard_data))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

        const rawOutput = await dockerService.runPythonCode(pythonScript, decryptedClientId, decryptedAccessToken);
        
        const jsonOutput = rawOutput.substring(rawOutput.indexOf('{'));
        const brokerData = JSON.parse(jsonOutput);

        const runningStrategies = user.strategies.filter(s => s.status === 'Running').length;

        const responsePayload = {
            brokerData: brokerData,
            savedStrategies: user.strategies.length,
            runningStrategies: runningStrategies
        };

        res.json(responsePayload);
    } catch (error) {
        console.error("Dashboard data error:", error);
        res.status(500).json({ message: "Error fetching dashboard data." });
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

