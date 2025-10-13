/**
 * Debug Database Links
 * Shows the actual userId values to identify the linking issue
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_USER_URI = process.env.MONGO_USER_URI;
const MONGO_STRATEGY_URI = process.env.MONGO_STRATEGY_URI;
const MONGO_CREDENTIALS_URI = process.env.MONGO_CREDENTIALS_URI;
const OLD_DB_URI = process.env.MONGO_URI;

async function debugLinks() {
    try {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║           DEBUGGING DATABASE LINKS                        ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Connect to databases
        const oldConn = await mongoose.createConnection(OLD_DB_URI).asPromise();
        const userConn = await mongoose.createConnection(MONGO_USER_URI).asPromise();
        const strategyConn = await mongoose.createConnection(MONGO_STRATEGY_URI).asPromise();
        const credentialsConn = await mongoose.createConnection(MONGO_CREDENTIALS_URI).asPromise();

        // Get all data
        const oldUsers = await oldConn.db.collection('users').find({}).toArray();
        const newUsers = await userConn.db.collection('users').find({}).toArray();
        const strategies = await strategyConn.db.collection('strategies').find({}).toArray();
        const credentials = await credentialsConn.db.collection('credentials').find({}).toArray();

        console.log('📊 OLD DATABASE (Capstone_Project)');
        console.log('═'.repeat(60));
        oldUsers.forEach(user => {
            console.log(`\n👤 ${user.email}`);
            console.log(`   OLD User ID: ${user._id}`);
            console.log(`   Strategies in old DB: ${user.strategies?.length || 0}`);
            if (user.strategies && user.strategies.length > 0) {
                user.strategies.forEach(s => {
                    console.log(`      - ${s.name}`);
                });
            }
            console.log(`   Has credentials: ${!!(user.clientId || user.accessToken) ? 'Yes' : 'No'}`);
        });

        console.log('\n\n📊 NEW DATABASE (user_db)');
        console.log('═'.repeat(60));
        newUsers.forEach(user => {
            console.log(`\n👤 ${user.email}`);
            console.log(`   NEW User ID: ${user._id}`);
        });

        console.log('\n\n📊 STRATEGIES DATABASE (strategy_db)');
        console.log('═'.repeat(60));
        strategies.forEach(strategy => {
            console.log(`\n📋 Strategy: ${strategy.name}`);
            console.log(`   Strategy ID: ${strategy._id}`);
            console.log(`   References userId: ${strategy.userId}`);
            
            // Find which user this belongs to
            const matchingNewUser = newUsers.find(u => u._id.toString() === strategy.userId.toString());
            const matchingOldUser = oldUsers.find(u => u._id.toString() === strategy.userId.toString());
            
            if (matchingNewUser) {
                console.log(`   ✓ MATCHES NEW USER: ${matchingNewUser.email}`);
            } else if (matchingOldUser) {
                console.log(`   ⚠️  MATCHES OLD USER: ${matchingOldUser.email}`);
                console.log(`   ❌ PROBLEM: Strategy is referencing OLD user ID, not NEW user ID!`);
            } else {
                console.log(`   ❌ NO MATCH FOUND - Orphaned strategy!`);
            }
        });

        console.log('\n\n📊 CREDENTIALS DATABASE (credentials_db)');
        console.log('═'.repeat(60));
        credentials.forEach(cred => {
            console.log(`\n🔑 Credential Set`);
            console.log(`   Credential ID: ${cred._id}`);
            console.log(`   References userId: ${cred.userId}`);
            console.log(`   Broker: ${cred.broker}`);
            
            // Find which user this belongs to
            const matchingNewUser = newUsers.find(u => u._id.toString() === cred.userId.toString());
            const matchingOldUser = oldUsers.find(u => u._id.toString() === cred.userId.toString());
            
            if (matchingNewUser) {
                console.log(`   ✓ MATCHES NEW USER: ${matchingNewUser.email}`);
            } else if (matchingOldUser) {
                console.log(`   ⚠️  MATCHES OLD USER: ${matchingOldUser.email}`);
                console.log(`   ❌ PROBLEM: Credential is referencing OLD user ID, not NEW user ID!`);
            } else {
                console.log(`   ❌ NO MATCH FOUND - Orphaned credential!`);
            }
        });

        console.log('\n\n═'.repeat(60));
        console.log('🔍 DIAGNOSIS');
        console.log('═'.repeat(60));
        
        const strategiesWithOldIds = strategies.filter(s => 
            oldUsers.find(u => u._id.toString() === s.userId.toString())
        );
        const credentialsWithOldIds = credentials.filter(c => 
            oldUsers.find(u => u._id.toString() === c.userId.toString())
        );
        
        if (strategiesWithOldIds.length > 0 || credentialsWithOldIds.length > 0) {
            console.log('❌ ISSUE FOUND: Strategies and/or credentials are referencing OLD user IDs');
            console.log(`   - ${strategiesWithOldIds.length} strategies need userId update`);
            console.log(`   - ${credentialsWithOldIds.length} credentials need userId update`);
            console.log('\n💡 SOLUTION: We need to update these userId references to match the NEW user IDs');
        } else {
            console.log('✅ All references are correct!');
        }

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

debugLinks();
