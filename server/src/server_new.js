// 1. Load environment variables from .env file
require('dotenv').config();

// --- Dependencies ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { connectDB } = require('./config/db');

// --- Import Routes ---
const authRoutes = require('./api/auth.routes');
const userRoutes = require('./api/user.routes');
const credentialsRoutes = require('./api/credentials.routes');
const strategyRoutes = require('./api/strategy.routes');

// --- Constants & App Initialization ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
const PORT = 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Connect to MongoDB Databases ---
connectDB();

// --- API Routes ---
app.use('/api/auth', authRoutes);          // Authentication routes
app.use('/api/user', userRoutes);          // User profile routes
app.use('/api/credentials', credentialsRoutes);  // Broker credentials routes
app.use('/api/strategies', strategyRoutes);      // Strategy management routes

// --- Terminal Execution Route ---
const authMiddleware = require('./middleware/auth.middleware');
const dockerService = require('./services/docker.service');
const getCredentialsModel = require('./models/Credentials.model');
const { decrypt } = require('./services/crypto.service');

app.post('/api/run', authMiddleware, async (req, res) => {
    const { code } = req.body;
    try {
        const Credentials = getCredentialsModel();
        const credentials = await Credentials.findOne({ userId: req.userId });
        
        if (!credentials || !credentials.clientId || !credentials.accessToken) {
            return res.status(400).json({ message: 'Please set your broker credentials first.' });
        }
        
        const decryptedClientId = decrypt(credentials.clientId);
        const decryptedAccessToken = decrypt(credentials.accessToken);
        
        const output = await dockerService.executeCode(code, decryptedClientId, decryptedAccessToken);
        res.json({ output });
    } catch (error) {
        console.error("Code execution error:", error);
        res.status(500).json({ message: 'Error executing code.', error: error.message });
    }
});

// --- Dashboard Route ---
const brokerService = require('./services/broker.service');

app.get('/api/dashboard', authMiddleware, async (req, res) => {
    try {
        const Credentials = getCredentialsModel();
        const getStrategyModel = require('./models/UserStrategy.model');
        const Strategy = getStrategyModel();
        
        const credentials = await Credentials.findOne({ userId: req.userId });
        
        if (!credentials || !credentials.clientId || !credentials.accessToken) {
            return res.status(400).json({ message: 'Please set your broker credentials first.' });
        }
        
        const decryptedClientId = decrypt(credentials.clientId);
        const decryptedAccessToken = decrypt(credentials.accessToken);
        
        const brokerData = await brokerService.getDashboardData(decryptedClientId, decryptedAccessToken);
        const activeStrategies = await Strategy.countDocuments({ userId: req.userId, status: 'Running' });
        
        res.json({
            brokerData,
            activeStrategies
        });
    } catch (error) {
        console.error("Dashboard data error:", error);
        res.status(500).json({ message: 'Error fetching dashboard data.' });
    }
});

// --- WebSocket for Real-time Logs ---
io.on('connection', (socket) => {
    console.log(`A user connected with socket ID: ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Export io for use in docker service
global.io = io;

// --- Start Server ---
server.listen(PORT, async () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
    
    // Build Docker image on server start
    try {
        await dockerService.buildImage();
    } catch (error) {
        console.error('Failed to build Docker image:', error);
    }
});
