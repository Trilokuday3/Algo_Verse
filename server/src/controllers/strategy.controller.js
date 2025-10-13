const getStrategyModel = require('../models/UserStrategy.model');
const getCredentialsModel = require('../models/Credentials.model');
const dockerService = require('../services/docker.service');
const { decrypt } = require('../services/crypto.service');

// Get all strategies for user
const getAllStrategies = async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategies = await Strategy.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(strategies);
    } catch (error) {
        console.error("Get strategies error:", error);
        res.status(500).json({ message: 'Server error fetching strategies.' });
    }
};

// Create new strategy
const createStrategy = async (req, res) => {
    const { name, code } = req.body;
    
    try {
        if (!name || !code) {
            return res.status(400).json({ message: 'Strategy name and code are required.' });
        }
        
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
        res.status(201).json({ 
            message: 'Strategy saved successfully!', 
            strategies: allStrategies 
        });
    } catch (error) {
        console.error("Save strategy error:", error);
        res.status(500).json({ message: 'Error saving strategy.' });
    }
};

// Get single strategy by ID
const getStrategy = async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ 
            _id: req.params.strategyId, 
            userId: req.userId 
        });
        
        if (!strategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }
        
        res.json(strategy);
    } catch (error) {
        console.error("Get strategy error:", error);
        res.status(500).json({ message: 'Server error fetching strategy.' });
    }
};

// Update strategy
const updateStrategy = async (req, res) => {
    const { name, code } = req.body;
    
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ 
            _id: req.params.strategyId, 
            userId: req.userId 
        });
        
        if (!strategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }

        // Check if another strategy with the new name already exists
        if (name && name !== strategy.name) {
            const existing = await Strategy.findOne({ 
                userId: req.userId, 
                name, 
                _id: { $ne: req.params.strategyId } 
            });
            
            if (existing) {
                return res.status(400).json({ message: 'Another strategy with this name already exists.' });
            }
        }
        
        if (name) strategy.name = name;
        if (code) strategy.code = code;
        
        await strategy.save();
        
        res.json({ message: 'Strategy updated successfully!', strategy });
    } catch (error) {
        console.error("Update strategy error:", error);
        res.status(500).json({ message: 'Error updating strategy.' });
    }
};

// Delete strategy
const deleteStrategy = async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOneAndDelete({ 
            _id: req.params.strategyId, 
            userId: req.userId 
        });
        
        if (!strategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }
        
        // Stop container if running
        if (strategy.containerId) {
            try {
                await dockerService.stopContainer(strategy.containerId);
            } catch (err) {
                console.error(`Error stopping container ${strategy.containerId}:`, err);
            }
        }
        
        res.json({ message: 'Strategy deleted successfully.' });
    } catch (error) {
        console.error("Delete strategy error:", error);
        res.status(500).json({ message: 'Error deleting strategy.' });
    }
};

// Start strategy
const startStrategy = async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const Credentials = getCredentialsModel();
        
        const strategy = await Strategy.findOne({ 
            _id: req.params.strategyId, 
            userId: req.userId 
        });
        
        if (!strategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }
        
        // Get credentials
        const credentials = await Credentials.findOne({ userId: req.userId });
        if (!credentials || !credentials.clientId || !credentials.accessToken) {
            return res.status(400).json({ message: 'Please set your broker credentials first.' });
        }
        
        const decryptedClientId = decrypt(credentials.clientId);
        const decryptedAccessToken = decrypt(credentials.accessToken);
        
        // Start Docker container
        const containerId = await dockerService.runStrategy(
            strategy.code,
            decryptedClientId,
            decryptedAccessToken,
            strategy.name
        );
        
        strategy.status = 'Running';
        strategy.containerId = containerId;
        await strategy.save();
        
        res.json({
            success: true,
            message: 'Strategy started successfully.',
            containerId
        });
    } catch (error) {
        console.error("Start strategy error:", error);
        res.status(500).json({ message: 'Error starting strategy.', error: error.message });
    }
};

// Stop strategy
const stopStrategy = async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ 
            _id: req.params.strategyId, 
            userId: req.userId 
        });
        
        if (!strategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }
        
        if (strategy.containerId) {
            await dockerService.stopContainer(strategy.containerId);
        }
        
        strategy.status = 'Stopped';
        strategy.containerId = null;
        await strategy.save();
        
        res.json({ 
            success: true, 
            message: 'Strategy stopped successfully.' 
        });
    } catch (error) {
        console.error("Stop strategy error:", error);
        res.status(500).json({ message: 'Error stopping strategy.' });
    }
};

// Pause strategy
const pauseStrategy = async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ 
            _id: req.params.strategyId, 
            userId: req.userId 
        });
        
        if (!strategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }
        
        if (strategy.containerId) {
            await dockerService.pauseContainer(strategy.containerId);
        }
        
        strategy.status = 'Paused';
        await strategy.save();
        
        res.json({ 
            success: true, 
            message: 'Strategy paused successfully.' 
        });
    } catch (error) {
        console.error("Pause strategy error:", error);
        res.status(500).json({ message: 'Error pausing strategy.' });
    }
};

// Resume strategy
const resumeStrategy = async (req, res) => {
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ 
            _id: req.params.strategyId, 
            userId: req.userId 
        });
        
        if (!strategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }
        
        if (strategy.containerId) {
            await dockerService.resumeContainer(strategy.containerId);
        }
        
        strategy.status = 'Running';
        await strategy.save();
        
        res.json({ 
            success: true, 
            message: 'Strategy resumed successfully.' 
        });
    } catch (error) {
        console.error("Resume strategy error:", error);
        res.status(500).json({ message: 'Error resuming strategy.' });
    }
};

module.exports = {
    getAllStrategies,
    createStrategy,
    getStrategy,
    updateStrategy,
    deleteStrategy,
    startStrategy,
    stopStrategy,
    pauseStrategy,
    resumeStrategy
};
