/**
 * Migration Script: Rename Tradehull to Dhan
 * This script updates all broker references from "tradehull" to "dhan" in the database
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URIs
const USER_DB_URI = process.env.MONGO_USER_URI;
const STRATEGY_DB_URI = process.env.MONGO_STRATEGY_URI;
const CREDENTIALS_DB_URI = process.env.MONGO_CREDENTIALS_URI;

async function migrateDatabase() {
    try {
        console.log('🚀 Starting migration: Tradehull → Dhan\n');

        // Connect to Credentials Database
        console.log('📦 Connecting to Credentials Database...');
        const credentialsConn = await mongoose.createConnection(CREDENTIALS_DB_URI);
        console.log('✅ Connected to Credentials DB\n');

        // Connect to Strategy Database
        console.log('📦 Connecting to Strategy Database...');
        const strategyConn = await mongoose.createConnection(STRATEGY_DB_URI);
        console.log('✅ Connected to Strategy DB\n');

        // Get Credentials collection
        const Credentials = credentialsConn.model('Credential', new mongoose.Schema({
            userId: String,
            broker: String,
            clientId: String,
            accessToken: String,
            brokerUsername: String,
            brokerPassword: String,
            totpSecret: String,
            apiKey: String,
            apiSecret: String,
        }, { timestamps: true }));

        // Get UserStrategies collection
        const UserStrategy = strategyConn.model('UserStrategy', new mongoose.Schema({
            userId: String,
            name: String,
            code: String,
            broker: String,
            status: String,
            containerId: String,
        }, { timestamps: true }));

        // Update Credentials
        console.log('🔄 Updating credentials...');
        const credentialsResult = await Credentials.updateMany(
            { broker: 'tradehull' },
            { $set: { broker: 'dhan' } }
        );
        console.log(`✅ Updated ${credentialsResult.modifiedCount} credential(s) from tradehull to dhan\n`);

        // Update UserStrategies
        console.log('🔄 Updating strategies...');
        const strategiesResult = await UserStrategy.updateMany(
            { broker: 'tradehull' },
            { $set: { broker: 'dhan' } }
        );
        console.log(`✅ Updated ${strategiesResult.modifiedCount} strategy(ies) from tradehull to dhan\n`);

        // Verify changes
        console.log('🔍 Verifying changes...');
        const remainingCredentials = await Credentials.countDocuments({ broker: 'tradehull' });
        const remainingStrategies = await UserStrategy.countDocuments({ broker: 'tradehull' });

        if (remainingCredentials === 0 && remainingStrategies === 0) {
            console.log('✅ Migration completed successfully!');
            console.log('   No "tradehull" entries remain in the database.\n');
        } else {
            console.log('⚠️  Warning: Some tradehull entries still exist:');
            console.log(`   Credentials: ${remainingCredentials}`);
            console.log(`   Strategies: ${remainingStrategies}\n`);
        }

        // Show current broker distribution
        console.log('📊 Current broker distribution:');
        
        const credentialsBrokers = await Credentials.aggregate([
            { $group: { _id: '$broker', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        console.log('\n   Credentials:');
        credentialsBrokers.forEach(item => {
            console.log(`   - ${item._id}: ${item.count}`);
        });

        const strategiesBrokers = await UserStrategy.aggregate([
            { $group: { _id: '$broker', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        console.log('\n   Strategies:');
        strategiesBrokers.forEach(item => {
            console.log(`   - ${item._id}: ${item.count}`);
        });

        // Close connections
        await credentialsConn.close();
        await strategyConn.close();
        
        console.log('\n✅ Migration completed and connections closed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
console.log('╔════════════════════════════════════════╗');
console.log('║  Tradehull → Dhan Migration Script   ║');
console.log('╚════════════════════════════════════════╝\n');

migrateDatabase();
