/**
 * Database Verification Script
 * Shows all data in the three new databases
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_USER_URI = process.env.MONGO_USER_URI;
const MONGO_STRATEGY_URI = process.env.MONGO_STRATEGY_URI;
const MONGO_CREDENTIALS_URI = process.env.MONGO_CREDENTIALS_URI;

async function verifyData() {
    try {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║           DATABASE VERIFICATION REPORT                    ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Connect to databases
        const userConn = await mongoose.createConnection(MONGO_USER_URI).asPromise();
        const strategyConn = await mongoose.createConnection(MONGO_STRATEGY_URI).asPromise();
        const credentialsConn = await mongoose.createConnection(MONGO_CREDENTIALS_URI).asPromise();

        console.log('✓ Connected to all databases\n');

        // Get collections
        const users = await userConn.db.collection('users').find({}).toArray();
        const strategies = await strategyConn.db.collection('strategies').find({}).toArray();
        const credentials = await credentialsConn.db.collection('credentials').find({}).toArray();

        // Display Users
        console.log('🔵 USER DATABASE (user_db)');
        console.log('═'.repeat(60));
        console.log(`Total Users: ${users.length}\n`);
        users.forEach((user, idx) => {
            console.log(`${idx + 1}. Email: ${user.email}`);
            console.log(`   Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
            console.log(`   Phone: ${user.phone || 'N/A'}`);
            console.log(`   Created: ${user.createdAt || user._id.getTimestamp()}`);
            console.log();
        });

        // Display Strategies
        console.log('🟢 STRATEGY DATABASE (strategy_db)');
        console.log('═'.repeat(60));
        console.log(`Total Strategies: ${strategies.length}\n`);
        
        // Group strategies by user
        const strategyByUser = strategies.reduce((acc, strategy) => {
            const userId = strategy.userId.toString();
            if (!acc[userId]) acc[userId] = [];
            acc[userId].push(strategy);
            return acc;
        }, {});

        Object.entries(strategyByUser).forEach(([userId, userStrategies]) => {
            const user = users.find(u => u._id.toString() === userId);
            console.log(`📊 User: ${user ? user.email : 'Unknown'} (${userStrategies.length} strategies)`);
            userStrategies.forEach((strategy, idx) => {
                console.log(`   ${idx + 1}. "${strategy.name}"`);
                console.log(`      Status: ${strategy.status || 'Idle'}`);
                console.log(`      Container: ${strategy.containerId || 'None'}`);
                console.log(`      Created: ${strategy.createdAt || 'N/A'}`);
            });
            console.log();
        });

        // Display Credentials
        console.log('🔴 CREDENTIALS DATABASE (credentials_db)');
        console.log('═'.repeat(60));
        console.log(`Total Credential Sets: ${credentials.length}\n`);
        credentials.forEach((cred, idx) => {
            const user = users.find(u => u._id.toString() === cred.userId.toString());
            console.log(`${idx + 1}. User: ${user ? user.email : 'Unknown'}`);
            console.log(`   Broker: ${cred.broker || 'N/A'}`);
            console.log(`   Has Client ID: ${cred.clientId ? '✓' : '✗'}`);
            console.log(`   Has Access Token: ${cred.accessToken ? '✓' : '✗'}`);
            console.log(`   Has Broker Username: ${cred.brokerUsername ? '✓' : '✗'}`);
            console.log(`   Has Broker Password: ${cred.brokerPassword ? '✓' : '✗'}`);
            console.log(`   Has TOTP Secret: ${cred.totpSecret ? '✓' : '✗'}`);
            console.log();
        });

        // Summary
        console.log('═'.repeat(60));
        console.log('📊 SUMMARY');
        console.log('═'.repeat(60));
        console.log(`✓ Users:        ${users.length}`);
        console.log(`✓ Strategies:   ${strategies.length}`);
        console.log(`✓ Credentials:  ${credentials.length}`);
        console.log('═'.repeat(60));

        console.log('\n✅ All databases are working correctly!');

        // Close connections
        await userConn.close();
        await strategyConn.close();
        await credentialsConn.close();
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyData();
