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
    const { name, code, broker } = req.body;
    
    try {
        if (!name || !code) {
            return res.status(400).json({ message: 'Strategy name and code are required.' });
        }
        
        if (!broker) {
            return res.status(400).json({ message: 'Broker selection is required.' });
        }
        
        // Validate broker
        const allowedBrokers = ['dhan', 'zerodha', 'upstox', 'angelone'];
        if (!allowedBrokers.includes(broker.toLowerCase())) {
            return res.status(400).json({ 
                message: `Invalid broker. Allowed: ${allowedBrokers.join(', ')}` 
            });
        }
        
        // Check if user has credentials for this broker
        const Credentials = getCredentialsModel();
        const credentials = await Credentials.findOne({ 
            userId: req.userId, 
            broker: broker.toLowerCase() 
        });
        
        if (!credentials) {
            return res.status(400).json({ 
                message: `No credentials found for ${broker}. Please add credentials first.` 
            });
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
            code,
            broker: broker.toLowerCase()
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
    const { name, code, broker } = req.body;
    
    console.log('=== UPDATE STRATEGY ===');
    console.log('Received broker:', broker);
    console.log('Received name:', name);
    
    try {
        const Strategy = getStrategyModel();
        const strategy = await Strategy.findOne({ 
            _id: req.params.strategyId, 
            userId: req.userId 
        });
        
        if (!strategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }

        console.log('Current strategy broker:', strategy.broker);
        console.log('Broker comparison:', broker, '!==', strategy.broker, '=', broker !== strategy.broker);

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
        
        // If changing broker, verify credentials exist (use case-insensitive comparison)
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
            console.log('Broker not changing (same broker selected)');
            // Still update the broker field to ensure consistency
            strategy.broker = broker.toLowerCase();
        }
        
        if (name) strategy.name = name;
        if (code) strategy.code = code;
        
        console.log('Saving strategy with broker:', strategy.broker);
        await strategy.save();
        
        console.log('Strategy saved. Final broker:', strategy.broker);
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
        
        // Get credentials for the broker associated with this strategy
        const credentials = await Credentials.findOne({ 
            userId: req.userId,
            broker: strategy.broker 
        });
        
        if (!credentials) {
            return res.status(400).json({ 
                message: `No credentials found for ${strategy.broker}. Please add ${strategy.broker} credentials first.` 
            });
        }
        
        if (!credentials.clientId || !credentials.accessToken) {
            return res.status(400).json({ 
                message: `Incomplete credentials for ${strategy.broker}. Please update your credentials.` 
            });
        }
        
        const decryptedClientId = decrypt(credentials.clientId);
        const decryptedAccessToken = decrypt(credentials.accessToken);
        
        // Validate decrypted values are not empty
        if (!decryptedClientId || decryptedClientId.trim() === '') {
            return res.status(400).json({ 
                message: `Client ID is missing for ${strategy.broker}. Please update your credentials in the Profile page.` 
            });
        }
        
        if (!decryptedAccessToken || decryptedAccessToken.trim() === '') {
            return res.status(400).json({ 
                message: `Access Token is missing for ${strategy.broker}. Please update your credentials in the Profile page.` 
            });
        }
        
        // Start Docker container with broker-specific credentials
        const containerId = await dockerService.runStrategy(
            strategy.code,
            decryptedClientId,
            decryptedAccessToken,
            strategy.name,
            strategy.broker  // Pass broker info to docker service
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

// Get all run history for user
const getAllRunHistory = async (req, res) => {
    try {
        const { getStrategyRunModel } = require('../models/StrategyRun.model');
        const StrategyRun = getStrategyRunModel();
        
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;
        
        const history = await StrategyRun.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);
        
        const total = await StrategyRun.countDocuments({ userId: req.userId });
        
        res.json({
            history,
            total,
            limit,
            skip
        });
    } catch (error) {
        console.error("Get run history error:", error);
        res.status(500).json({ message: 'Error fetching run history.' });
    }
};

// Get run history for specific strategy
const getStrategyRunHistory = async (req, res) => {
    try {
        const { getStrategyRunModel } = require('../models/StrategyRun.model');
        const StrategyRun = getStrategyRunModel();
        
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;
        
        const history = await StrategyRun.find({ 
            userId: req.userId,
            strategyId: req.params.strategyId
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);
        
        const total = await StrategyRun.countDocuments({ 
            userId: req.userId,
            strategyId: req.params.strategyId
        });
        
        res.json({
            history,
            total,
            limit,
            skip
        });
    } catch (error) {
        console.error("Get strategy run history error:", error);
        res.status(500).json({ message: 'Error fetching strategy run history.' });
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
    resumeStrategy,
    getAllRunHistory,
    getStrategyRunHistory
};
