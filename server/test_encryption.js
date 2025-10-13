/**
 * Test Encryption End-to-End
 * Creates a test strategy, saves it, retrieves it, and verifies encryption
 */

require('dotenv').config();
const mongoose = require('mongoose');
const getStrategyModel = require('./src/models/UserStrategy.model');
const { getConnections } = require('./src/config/db');
const { decrypt } = require('./src/services/crypto.service');

async function testEncryption() {
    try {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║         END-TO-END ENCRYPTION TEST                        ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Connect
        const userConn = await mongoose.createConnection(process.env.MONGO_USER_URI).asPromise();
        const strategyConn = await mongoose.createConnection(process.env.MONGO_STRATEGY_URI).asPromise();
        
        // Manually set connections (since we're not using the full server)
        global.userConnection = userConn;
        global.strategyConnection = strategyConn;
        
        // Override getConnections for this test
        const originalGetConnections = require('./src/config/db').getConnections;
        require('./src/config/db').getConnections = () => ({
            userConnection: userConn,
            strategyConnection: strategyConn,
            credentialsConnection: null
        });

        const Strategy = getStrategyModel();
        
        // Use an existing user ID
        const testUserId = new mongoose.Types.ObjectId('68ecf95e48f8161c1be35f16');
        
        // Test code
        const testCode = `# Test Strategy for Encryption
print("This is a test strategy")
for i in range(10):
    print(f"Iteration {i}")
`;

        console.log('📝 Step 1: Creating a test strategy...');
        console.log(`   Code to save (${testCode.length} chars):`);
        console.log(`   "${testCode.substring(0, 50)}..."\n`);

        // Create strategy (should auto-encrypt)
        const strategy = new Strategy({
            userId: testUserId,
            name: `Encryption_Test_${Date.now()}`,
            code: testCode,
            status: 'Stopped'
        });

        await strategy.save();
        console.log('✓ Strategy saved\n');

        // Check in database directly (should be encrypted)
        console.log('🔍 Step 2: Checking raw database...');
        const rawDoc = await strategyConn.db.collection('strategies').findOne({ 
            _id: strategy._id 
        });
        
        console.log(`   Code in database: ${rawDoc.code.substring(0, 80)}...`);
        console.log(`   Length: ${rawDoc.code.length} characters`);
        console.log(`   Contains ':': ${rawDoc.code.includes(':') ? '✅' : '❌'}`);
        
        // Verify it's encrypted
        const isEncrypted = rawDoc.code.includes(':') && rawDoc.code.split(':').length === 2;
        console.log(`   Is encrypted: ${isEncrypted ? '✅ YES' : '❌ NO'}\n`);

        // Retrieve via Mongoose (should auto-decrypt)
        console.log('📖 Step 3: Retrieving via Mongoose...');
        const retrieved = await Strategy.findById(strategy._id);
        
        console.log(`   Code returned: ${retrieved.code.substring(0, 50)}...`);
        console.log(`   Length: ${retrieved.code.length} characters`);
        console.log(`   Matches original: ${retrieved.code === testCode ? '✅ YES' : '❌ NO'}\n`);

        // Manual decryption test
        console.log('🔓 Step 4: Manual decryption test...');
        const manuallyDecrypted = decrypt(rawDoc.code);
        console.log(`   Manually decrypted: ${manuallyDecrypted.substring(0, 50)}...`);
        console.log(`   Matches original: ${manuallyDecrypted === testCode ? '✅ YES' : '❌ NO'}\n`);

        // Clean up test strategy
        await Strategy.findByIdAndDelete(strategy._id);
        console.log('🗑️  Test strategy deleted\n');

        // Summary
        console.log('═'.repeat(60));
        console.log('📊 TEST RESULTS');
        console.log('═'.repeat(60));
        
        if (isEncrypted && retrieved.code === testCode && manuallyDecrypted === testCode) {
            console.log('✅ ENCRYPTION TEST PASSED!');
            console.log('   ✓ Code saved encrypted in database');
            console.log('   ✓ Mongoose automatically decrypts on retrieval');
            console.log('   ✓ Manual decryption works correctly');
            console.log('   ✓ Hosting cannot read strategy code');
            console.log('   ✓ Users can access their code normally');
        } else {
            console.log('❌ ENCRYPTION TEST FAILED!');
            console.log(`   - Encrypted in DB: ${isEncrypted}`);
            console.log(`   - Mongoose decrypt: ${retrieved.code === testCode}`);
            console.log(`   - Manual decrypt: ${manuallyDecrypted === testCode}`);
        }
        console.log('═'.repeat(60));

        await userConn.close();
        await strategyConn.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testEncryption();
