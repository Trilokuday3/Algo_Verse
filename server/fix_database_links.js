/**
 * Fix Database Links
 * This script properly maps old user IDs to new user IDs
 * and updates all strategy and credential references
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Wait for connections with retry logic
async function connectWithRetry(uri, name, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const conn = await mongoose.createConnection(uri).asPromise();
            console.log(`✓ Connected to ${name}`);
            return conn;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.log(`   Retry ${i + 1}/${maxRetries} for ${name}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function fixLinks() {
    let oldConn, userConn, strategyConn, credentialsConn;
    
    try {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║           FIXING DATABASE LINKS                           ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        console.log('📡 Connecting to databases...\n');
        
        oldConn = await connectWithRetry(process.env.MONGO_URI, 'Old Database (Capstone_Project)');
        userConn = await connectWithRetry(process.env.MONGO_USER_URI, 'User Database (user_db)');
        strategyConn = await connectWithRetry(process.env.MONGO_STRATEGY_URI, 'Strategy Database (strategy_db)');
        credentialsConn = await connectWithRetry(process.env.MONGO_CREDENTIALS_URI, 'Credentials Database (credentials_db)');
        
        console.log('\n📊 Fetching data...\n');

        // Get all data
        const oldUsers = await oldConn.db.collection('users').find({}).toArray();
        const newUsers = await userConn.db.collection('users').find({}).toArray();
        const strategies = await strategyConn.db.collection('strategies').find({}).toArray();
        const credentials = await credentialsConn.db.collection('credentials').find({}).toArray();

        console.log(`Found: ${oldUsers.length} old users, ${newUsers.length} new users`);
        console.log(`Found: ${strategies.length} strategies, ${credentials.length} credentials\n`);

        // Create email-based mapping (OLD ID → NEW ID)
        const idMapping = {};
        
        console.log('🔗 Creating user ID mappings...\n');
        for (const oldUser of oldUsers) {
            const newUser = newUsers.find(u => u.email === oldUser.email);
            if (newUser) {
                const oldId = oldUser._id.toString();
                const newId = newUser._id;
                idMapping[oldId] = newId;
                console.log(`   ${oldUser.email}`);
                console.log(`   OLD: ${oldId} → NEW: ${newId}`);
            }
        }

        if (Object.keys(idMapping).length === 0) {
            console.log('\n⚠️  No mappings created. Users might already be correctly linked.');
            return;
        }

        console.log(`\n✓ Created ${Object.keys(idMapping).length} user ID mappings\n`);

        // Fix strategies
        console.log('🔧 Fixing strategy references...\n');
        let strategiesFixed = 0;
        
        for (const strategy of strategies) {
            const currentUserId = strategy.userId.toString();
            const newUserId = idMapping[currentUserId];
            
            if (newUserId && currentUserId !== newUserId.toString()) {
                await strategyConn.db.collection('strategies').updateOne(
                    { _id: strategy._id },
                    { $set: { userId: newUserId } }
                );
                console.log(`   ✓ Fixed "${strategy.name}" → now linked to ${newUserId}`);
                strategiesFixed++;
            } else if (newUserId) {
                console.log(`   ✓ "${strategy.name}" already correctly linked`);
            } else {
                console.log(`   ⚠️  "${strategy.name}" - no mapping found for userId: ${currentUserId}`);
            }
        }

        // Fix credentials
        console.log('\n🔧 Fixing credential references...\n');
        let credentialsFixed = 0;
        
        for (const cred of credentials) {
            const currentUserId = cred.userId.toString();
            const newUserId = idMapping[currentUserId];
            
            if (newUserId && currentUserId !== newUserId.toString()) {
                // Find the user email for display
                const userEmail = Object.entries(idMapping).find(([oldId, newId]) => 
                    newId.toString() === newUserId.toString()
                );
                const oldUser = oldUsers.find(u => u._id.toString() === currentUserId);
                
                await credentialsConn.db.collection('credentials').updateOne(
                    { _id: cred._id },
                    { $set: { userId: newUserId } }
                );
                console.log(`   ✓ Fixed credentials for ${oldUser?.email || 'Unknown'} → now linked to ${newUserId}`);
                credentialsFixed++;
            } else if (newUserId) {
                const oldUser = oldUsers.find(u => u._id.toString() === currentUserId);
                console.log(`   ✓ Credentials for ${oldUser?.email || 'Unknown'} already correctly linked`);
            } else {
                console.log(`   ⚠️  Credential - no mapping found for userId: ${currentUserId}`);
            }
        }

        // Summary
        console.log('\n' + '═'.repeat(60));
        console.log('📊 FIX SUMMARY');
        console.log('═'.repeat(60));
        console.log(`✓ User mappings created:     ${Object.keys(idMapping).length}`);
        console.log(`✓ Strategies fixed:          ${strategiesFixed}`);
        console.log(`✓ Credentials fixed:         ${credentialsFixed}`);
        console.log('═'.repeat(60));

        if (strategiesFixed === 0 && credentialsFixed === 0) {
            console.log('\n✅ All links were already correct!');
        } else {
            console.log('\n✅ Database links have been fixed!');
            console.log('💡 Now test your application to verify everything works.');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        // Close all connections
        console.log('\n🔌 Closing connections...');
        if (oldConn) await oldConn.close();
        if (userConn) await userConn.close();
        if (strategyConn) await strategyConn.close();
        if (credentialsConn) await credentialsConn.close();
        console.log('✓ Done\n');
        process.exit(0);
    }
}

fixLinks();
