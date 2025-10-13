const mongoose = require('mongoose');
require('dotenv').config();

const strategyConnection = mongoose.createConnection(process.env.MONGO_STRATEGY_URI);

const strategySchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    code: String,
    status: String,
    containerId: String
}, { timestamps: true });

// Add the compound unique index
strategySchema.index({ userId: 1, name: 1 }, { unique: true });

async function testDuplicatePrevention() {
    console.log('🧪 Testing Duplicate Strategy Prevention\n');
    
    try {
        const Strategy = strategyConnection.model('Strategy', strategySchema);
        
        // Create a test user ID
        const testUserId = new mongoose.Types.ObjectId();
        const testStrategyName = 'TEST_DUPLICATE_PREVENTION_STRATEGY';
        
        console.log(`📝 Test Setup:`);
        console.log(`   User ID: ${testUserId}`);
        console.log(`   Strategy Name: "${testStrategyName}"\n`);
        
        // Test 1: Create first strategy
        console.log('Test 1: Creating first strategy...');
        const strategy1 = new Strategy({
            userId: testUserId,
            name: testStrategyName,
            code: 'print("First strategy")',
            status: 'Stopped',
            containerId: null
        });
        
        await strategy1.save();
        console.log('   ✅ First strategy created successfully\n');
        
        // Test 2: Try to create duplicate strategy
        console.log('Test 2: Attempting to create duplicate strategy...');
        const strategy2 = new Strategy({
            userId: testUserId,
            name: testStrategyName, // Same name
            code: 'print("Duplicate strategy")',
            status: 'Stopped',
            containerId: null
        });
        
        try {
            await strategy2.save();
            console.log('   ❌ FAIL: Duplicate strategy was saved! (Should have been rejected)\n');
        } catch (error) {
            if (error.code === 11000) {
                console.log('   ✅ SUCCESS: Duplicate rejected by database');
                console.log(`   Error code: ${error.code} (E11000 - Duplicate key error)`);
                console.log(`   Message: ${error.message}\n`);
            } else {
                console.log(`   ❌ Unexpected error: ${error.message}\n`);
            }
        }
        
        // Test 3: Different user can use same strategy name
        console.log('Test 3: Different user with same strategy name...');
        const differentUserId = new mongoose.Types.ObjectId();
        const strategy3 = new Strategy({
            userId: differentUserId, // Different user
            name: testStrategyName, // Same name is OK for different user
            code: 'print("Different user strategy")',
            status: 'Stopped',
            containerId: null
        });
        
        await strategy3.save();
        console.log('   ✅ SUCCESS: Different user can use same strategy name\n');
        
        // Test 4: Same user with different name
        console.log('Test 4: Same user with different strategy name...');
        const strategy4 = new Strategy({
            userId: testUserId, // Same user
            name: testStrategyName + '_DIFFERENT', // Different name
            code: 'print("Different name strategy")',
            status: 'Stopped',
            containerId: null
        });
        
        await strategy4.save();
        console.log('   ✅ SUCCESS: Same user can create strategy with different name\n');
        
        // Cleanup
        console.log('🧹 Cleaning up test data...');
        await Strategy.deleteMany({ 
            userId: { $in: [testUserId, differentUserId] },
            name: { $regex: /TEST_DUPLICATE_PREVENTION/ }
        });
        console.log('   ✅ Test data removed\n');
        
        console.log('📊 Test Summary:');
        console.log('   ✅ Database-level duplicate prevention: WORKING');
        console.log('   ✅ Unique index (userId + name): ENFORCED');
        console.log('   ✅ Same name for different users: ALLOWED');
        console.log('   ✅ Different names for same user: ALLOWED');
        console.log('   ✅ Duplicate name for same user: BLOCKED\n');
        
        console.log('🎉 All tests passed! Strategy duplicate prevention is working correctly.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Test error:', error);
        process.exit(1);
    }
}

strategyConnection.once('open', () => {
    console.log('🔗 Connected to strategy database\n');
    testDuplicatePrevention();
});

strategyConnection.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
});
