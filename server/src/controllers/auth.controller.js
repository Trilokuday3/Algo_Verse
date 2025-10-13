const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getUserModel = require('../models/User.model');

const JWT_SECRET = process.env.JWT_SECRET;

// Register or Login (combined endpoint)
const authenticate = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        
        const User = getUserModel();
        
        let user = await User.findOne({ email });
        
        if (user) {
            // Login existing user
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials.' });
            }
        } else {
            // Register new user
            const hashedPassword = await bcrypt.hash(password, 10);
            user = new User({ email, password: hashedPassword });
            await user.save();
        }
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, message: 'Logged in successfully!' });
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};

// Register endpoint (separate if needed)
const register = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }
        
        const User = getUserModel();
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered.' });
        }
        
        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ token, message: 'Registration successful!' });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

// Login endpoint (separate if needed)
const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        
        const User = getUserModel();
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, message: 'Login successful!' });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

// Verify token endpoint
const verifyToken = async (req, res) => {
    try {
        const User = getUserModel();
        const user = await User.findById(req.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        res.json({ 
            valid: true, 
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error("Verify token error:", error);
        res.status(500).json({ message: 'Error verifying token.' });
    }
};

module.exports = {
    authenticate,
    register,
    login,
    verifyToken
};
