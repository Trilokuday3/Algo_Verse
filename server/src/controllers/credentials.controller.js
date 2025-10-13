const getCredentialsModel = require('../models/Credentials.model');
const { encrypt, decrypt } = require('../services/crypto.service');

// Save or update broker credentials
const saveCredentials = async (req, res) => {
    const { clientId, accessToken, brokerUsername, brokerPassword, totpSecret, broker, apiKey, apiSecret } = req.body;
    
    try {
        // Validate broker is provided
        if (!broker) {
            return res.status(400).json({ message: 'Broker selection is required.' });
        }
        
        // Validate broker is one of the allowed brokers
        const allowedBrokers = ['dhan', 'zerodha', 'upstox', 'angelone', 'tradehull'];
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
};

// Get all broker credentials for user
const getCredentials = async (req, res) => {
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
};

// Get credentials for a specific broker
const getBrokerCredentials = async (req, res) => {
    try {
        const Credentials = getCredentialsModel();
        const broker = req.params.broker.toLowerCase();
        
        const cred = await Credentials.findOne({ 
            userId: req.userId, 
            broker: broker 
        });
        
        if (!cred) {
            return res.status(404).json({ message: `No credentials found for ${broker}.` });
        }
        
        // Decrypt for display
        const decryptedCredential = {
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
        };
        
        res.json(decryptedCredential);
    } catch (error) {
        console.error("Get broker credentials error:", error);
        res.status(500).json({ message: "Error fetching broker credentials." });
    }
};

// Delete a specific broker's credentials
const deleteCredentials = async (req, res) => {
    try {
        const Credentials = getCredentialsModel();
        const broker = req.params.broker.toLowerCase();
        
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
};

module.exports = {
    saveCredentials,
    getCredentials,
    getBrokerCredentials,
    deleteCredentials
};
