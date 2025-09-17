// 1. Load environment variables from .env file
require('dotenv').config();

// --- Dependencies ---
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { buildImage, runPythonCode } = require('./services/docker.service');
const connectDB = require('./config/db');
const User = require('./models/User.model');
const authMiddleware = require('./middleware/auth.middleware');
const { encrypt, decrypt } = require('./services/crypto.service');

// --- Constants ---
const JWT_SECRET = process.env.JWT_SECRET;
const app = express();
const PORT = 3000;

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
        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter all fields.' });
        }
        let user = await User.findOne({ email });

        if (user) { // Login existing user
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Incorrect password.' });
            }
        } else { // Register new user
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

// --- Protected Route: Save Credentials ---
app.post('/api/credentials', authMiddleware, async (req, res) => {
    const { clientId, accessToken } = req.body;
    try {
        const encryptedClientId = encrypt(clientId);
        const encryptedAccessToken = encrypt(accessToken);

        await User.findByIdAndUpdate(req.userId, { 
            clientId: encryptedClientId, 
            accessToken: encryptedAccessToken 
        });
        
        res.json({ message: 'Credentials saved securely!' });
    } catch (error) {
        res.status(500).json({ message: "Error saving credentials." });
    }
});

// --- NEW Route to get all strategies for the logged-in user ---
app.get('/api/strategies', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('strategies');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(user.strategies);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching strategies.' });
    }
});

// --- NEW Route to save a new strategy for the logged-in user ---
app.post('/api/strategies', authMiddleware, async (req, res) => {
    const { name, code } = req.body;
    if (!name || !code) {
        return res.status(400).json({ message: 'Strategy name and code are required.' });
    }

    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        user.strategies.push({ name, code });
        await user.save();

        res.status(201).json({ message: 'Strategy saved successfully!', strategies: user.strategies });
    } catch (error) {
        res.status(500).json({ message: 'Error saving strategy.' });
    }
});

// --- Protected Route: Run Strategy ---
app.post('/api/run', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.userId);
        if (!user || !user.clientId || !user.accessToken) {
            return res.status(400).json({ output: 'Error: Broker credentials not set.' });
        }

        const decryptedClientId = decrypt(user.clientId);
        const decryptedAccessToken = decrypt(user.accessToken);

        const output = await runPythonCode(code, decryptedClientId, decryptedAccessToken);
        res.json({ output });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =================================================================
// --- Server Startup ---
// =================================================================
async function startServer() {
    try {
        await connectDB();
        await buildImage();
        app.listen(PORT, () => {
            console.log(`Server is listening on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
}

startServer();