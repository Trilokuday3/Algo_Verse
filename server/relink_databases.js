/**
 * Re-link Database Script
 * 
 * This script fixes the userId references across the three databases
 * by matching users by email and updating all strategy and credential references
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_USER_URI = process.env.MONGO_USER_URI;
const MONGO_STRATEGY_URI = process.env.MONGO_STRATEGY_URI;
const MONGO_CREDENTIALS_URI = process.env.MONGO_CREDENTIALS_URI;
const OLD_DB_URI = process.env.MONGO_URI;

async function relinkData() {
    try {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║           RE-LINKING DATABASE REFERENCES                  ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Connect to all databases
        console.log('📡 Connecting to databases...');
        const oldConn = await mongoose.createConnection(OLD_DB_URI).asPromise();
        const userConn = await mongoose.createConnection(MONGO_USER_URI).asPromise();
        const strategyConn = await mongoose.createConnection(MONGO_STRATEGY_URI).asPromise();
        const credentialsConn = await mongoose.createConnection(MONGO_CREDENTIALS_URI).asPromise();
        console.log('✓ All connections established\n');

        // Get all data
        const oldUsers = await oldConn.db.collection('users').find({}).toArray();
        const newUsers = await userConn.db.collection('users').find({}).toArray();
        const strategies = await strategyConn.db.collection('strategies').find({}).toArray();
        const credentials = await credentialsConn.db.collection('credentials').find({}).toArray();

        console.log('📊 Current Data:');
        console.log(`   Old Users: ${oldUsers.length}`);
        console.log(`   New Users: ${newUsers.length}`);
        console.log(`   Strategies: ${strategies.length}`);
        console.log(`   Credentials: ${credentials.length}\n`);

        // Create mapping from old user IDs to new user IDs based on email
        const userIdMapping = {};
        
        for (const oldUser of oldUsers) {
            const newUser = newUsers.find(u => u.email === oldUser.email);
            if (newUser) {
                userIdMapping[oldUser._id.toString()] = newUser._id;
                console.log(`🔗 Mapping: ${oldUser.email}`);
                console.log(`   Old ID: ${oldUser._id}`);
                console.log(`   New ID: ${newUser._id}\n`);
            }
        }

        let strategiesUpdated = 0;
        let credentialsUpdated = 0;

        // Update strategy references
        console.log('🔄 Updating strategy references...');
        for (const strategy of strategies) {
            const oldUserId = strategy.userId.toString();
            const newUserId = userIdMapping[oldUserId];
            
            if (newUserId) {
                await strategyConn.db.collection('strategies').updateOne(
                    { _id: strategy._id },
                    { $set: { userId: newUserId } }
                );
                strategiesUpdated++;
                console.log(`   ✓ Updated strategy "${strategy.name}"`);
            } else {
                console.log(`   ⚠️  No mapping found for strategy "${strategy.name}" (userId: ${oldUserId})`);
            }
        }

        // Update credential references
        console.log('\n🔄 Updating credential references...');
        for (const cred of credentials) {
            const oldUserId = cred.userId.toString();
            const newUserId = userIdMapping[oldUserId];
            
            if (newUserId) {
                await credentialsConn.db.collection('credentials').updateOne(
                    { _id: cred._id },
                    { $set: { userId: newUserId } }
                );
                credentialsUpdated++;
                
                // Find user email for display
                const user = newUsers.find(u => u._id.toString() === newUserId.toString());
                console.log(`   ✓ Updated credentials for ${user ? user.email : 'Unknown'}`);
            } else {
                console.log(`   ⚠️  No mapping found for credential (userId: ${oldUserId})`);
            }
        }

        // Verify the re-linking
        console.log('\n🔍 Verifying re-linked data...\n');
        
        const updatedStrategies = await strategyConn.db.collection('strategies').find({}).toArray();
        const updatedCredentials = await credentialsConn.db.collection('credentials').find({}).toArray();
        
        // Group by user
        for (const newUser of newUsers) {
            const userId = newUser._id.toString();
            const userStrategies = updatedStrategies.filter(s => s.userId.toString() === userId);
            const userCredentials = updatedCredentials.find(c => c.userId.toString() === userId);
            
            console.log(`👤 ${newUser.email}`);
            console.log(`   User ID: ${userId}`);
            console.log(`   Strategies: ${userStrategies.length}`);
            userStrategies.forEach(s => {
                console.log(`      - ${s.name} (${s.status})`);
            });
            console.log(`   Credentials: ${userCredentials ? '✓' : '✗'}`);
            if (userCredentials) {
                console.log(`      Broker: ${userCredentials.broker}`);
            }
            console.log();
        }

        // Summary
        console.log('═'.repeat(60));
        console.log('📊 RE-LINKING SUMMARY');
        console.log('═'.repeat(60));
        console.log(`✓ User mappings created:     ${Object.keys(userIdMapping).length}`);
        console.log(`✓ Strategies updated:        ${strategiesUpdated}`);
        console.log(`✓ Credentials updated:       ${credentialsUpdated}`);
        console.log('═'.repeat(60));
        
        console.log('\n✅ All data successfully re-linked!');
        console.log('💡 Your application should now work correctly with the new database structure.');

        // Close connections
        await oldConn.close();
        await userConn.close();
        await strategyConn.close();
        await credentialsConn.close();
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

relinkData();
