const getUserModel = require('../models/User.model');
const getStrategyModel = require('../models/UserStrategy.model');
const getCredentialsModel = require('../models/Credentials.model');

// Get user profile with all related data
const getProfile = async (req, res) => {
    try {
        const User = getUserModel();
        const Strategy = getStrategyModel();
        const Credentials = getCredentialsModel();

        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
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
};

// Update user profile information
const updateProfile = async (req, res) => {
    const { firstName, lastName, phone } = req.body;
    
    try {
        const User = getUserModel();
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Update fields if provided
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (phone !== undefined) user.phone = phone;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Profile updated successfully.',
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: 'Error updating profile.' });
    }
};

// Change user password
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }
        
        const User = getUserModel();
        const bcrypt = require('bcryptjs');
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }
        
        // Hash and save new password
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        
        res.json({
            success: true,
            message: 'Password changed successfully.'
        });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: 'Error changing password.' });
    }
};

// Delete user account and all associated data
const deleteAccount = async (req, res) => {
    try {
        const User = getUserModel();
        const Strategy = getStrategyModel();
        const Credentials = getCredentialsModel();
        const dockerService = require('../services/docker.service');
        
        // Get all user's strategies to stop running containers
        const strategies = await Strategy.find({ userId: req.userId });
        
        // Stop all running containers for this user
        for (const strategy of strategies) {
            if (strategy.containerId) {
                try {
                    await dockerService.stopContainer(strategy.containerId);
                    console.log(`Container ${strategy.containerId} stopped for deleted user`);
                } catch (err) {
                    console.error(`Error stopping container ${strategy.containerId}:`, err);
                }
            }
        }
        
        // Delete all strategies
        await Strategy.deleteMany({ userId: req.userId });
        console.log(`Deleted ${strategies.length} strategies for user ${req.userId}`);
        
        // Delete all credentials
        const credentialsDeleted = await Credentials.deleteMany({ userId: req.userId });
        console.log(`Deleted ${credentialsDeleted.deletedCount} credential records for user ${req.userId}`);
        
        // Delete user account
        await User.findByIdAndDelete(req.userId);
        console.log(`Deleted user account: ${req.userId}`);
        
        res.json({ message: 'Account deleted successfully.' });
    } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ message: 'Error deleting account.' });
    }
};

// Get all broker credentials with timestamps (for token expiry check)
const getBrokerCredentials = async (req, res) => {
    try {
        const Credentials = getCredentialsModel();
        
        // Get all credentials for the user
        const credentials = await Credentials.find({ userId: req.userId }).select('-accessToken -clientId -brokerPassword -apiSecret -totpSecret');
        
        // Return credentials with metadata (not the actual sensitive data)
        const credentialsList = credentials.map(cred => ({
            broker: cred.broker,
            hasClientId: !!cred.clientId,
            hasAccessToken: !!cred.accessToken,
            updatedAt: cred.updatedAt,
            createdAt: cred.createdAt
        }));
        
        res.json({ credentials: credentialsList });
    } catch (error) {
        console.error("Get broker credentials error:", error);
        res.status(500).json({ message: 'Error fetching broker credentials.' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    getBrokerCredentials
};
