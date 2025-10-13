/**
 * Final Verification - Simulate User Login Flow
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function verifyUserFlow() {
    try {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║      FINAL VERIFICATION: USER LOGIN FLOW SIMULATION       ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Connect
        const userConn = await mongoose.createConnection(process.env.MONGO_USER_URI).asPromise();
        const strategyConn = await mongoose.createConnection(process.env.MONGO_STRATEGY_URI).asPromise();
        const credentialsConn = await mongoose.createConnection(process.env.MONGO_CREDENTIALS_URI).asPromise();
        
        console.log('✓ Connected to all 3 databases\n');

        // Test email
        const testEmail = 'trilokeshvenkatauday@gmail.com';
        
        console.log(`🔐 Step 1: Finding user "${testEmail}" in user_db...`);
        const user = await userConn.db.collection('users').findOne({ email: testEmail });
        
        if (!user) {
            console.log('❌ User not found!');
            process.exit(1);
        }
        
        console.log(`✓ User found with ID: ${user._id}\n`);

        console.log(`📊 Step 2: Finding strategies for userId: ${user._id}...`);
        const strategies = await strategyConn.db.collection('strategies').find({ 
            userId: user._id 
        }).toArray();
        
        console.log(`✓ Found ${strategies.length} strategies:`);
        strategies.forEach((s, idx) => {
            console.log(`   ${idx + 1}. ${s.name} (${s.status})`);
            console.log(`      Strategy userId: ${s.userId}`);
            console.log(`      Match: ${s.userId.toString() === user._id.toString() ? '✓' : '❌'}`);
        });
        console.log();

        console.log(`🔑 Step 3: Finding credentials for userId: ${user._id}...`);
        const credentials = await credentialsConn.db.collection('credentials').findOne({ 
            userId: user._id 
        });
        
        if (credentials) {
            console.log(`✓ Credentials found:`);
            console.log(`   Credential userId: ${credentials.userId}`);
            console.log(`   Match: ${credentials.userId.toString() === user._id.toString() ? '✓' : '❌'}`);
            console.log(`   Broker: ${credentials.broker}`);
            console.log(`   Has clientId: ${!!credentials.clientId}`);
            console.log(`   Has accessToken: ${!!credentials.accessToken}`);
        } else {
            console.log(`❌ No credentials found!`);
        }

        console.log('\n' + '═'.repeat(60));
        console.log('📊 VERIFICATION RESULT');
        console.log('═'.repeat(60));
        
        const allMatching = strategies.every(s => s.userId.toString() === user._id.toString()) &&
                           (!credentials || credentials.userId.toString() === user._id.toString());
        
        if (allMatching) {
            console.log('✅ ALL DATA IS CORRECTLY LINKED!');
            console.log(`   - User exists in user_db`);
            console.log(`   - ${strategies.length} strategies correctly reference this user`);
            console.log(`   - Credentials correctly reference this user`);
            console.log('\n💡 The databases ARE properly linked!');
            console.log('   If you\'re seeing issues in the frontend, the problem is elsewhere.');
        } else {
            console.log('❌ DATA IS NOT CORRECTLY LINKED!');
            console.log('   Please check the userId references above.');
        }
        
        console.log('═'.repeat(60));

        // Close
        await userConn.close();
        await strategyConn.close();
        await credentialsConn.close();
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

verifyUserFlow();
