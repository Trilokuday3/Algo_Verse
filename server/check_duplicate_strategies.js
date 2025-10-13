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

async function checkDuplicateStrategies() {
    console.log('🔍 Checking for Duplicate Strategy Names\n');
    
    try {
        const Strategy = strategyConnection.model('Strategy', strategySchema);
        
        // Get all strategies
        const allStrategies = await Strategy.find({});
        console.log(`📊 Total strategies in database: ${allStrategies.length}\n`);
        
        // Group by userId and name
        const userStrategyMap = {};
        
        allStrategies.forEach(strategy => {
            const userId = strategy.userId.toString();
            const name = strategy.name;
            
            if (!userStrategyMap[userId]) {
                userStrategyMap[userId] = {};
            }
            
            if (!userStrategyMap[userId][name]) {
                userStrategyMap[userId][name] = [];
            }
            
            userStrategyMap[userId][name].push({
                id: strategy._id.toString(),
                createdAt: strategy.createdAt,
                status: strategy.status
            });
        });
        
        // Check for duplicates
        let duplicatesFound = false;
        console.log('🔍 Analyzing Strategies per User:\n');
        
        Object.keys(userStrategyMap).forEach((userId, userIdx) => {
            console.log(`👤 User ${userIdx + 1} (${userId.substring(0, 8)}...):`);
            
            const userStrategies = userStrategyMap[userId];
            const strategyNames = Object.keys(userStrategies);
            
            console.log(`   Total unique names: ${strategyNames.length}`);
            
            strategyNames.forEach(name => {
                const strategies = userStrategies[name];
                
                if (strategies.length > 1) {
                    console.log(`\n   ❌ DUPLICATE FOUND: "${name}"`);
                    console.log(`      Count: ${strategies.length} strategies with same name`);
                    strategies.forEach((s, idx) => {
                        console.log(`      ${idx + 1}. ID: ${s.id.substring(0, 8)}... | Created: ${s.createdAt} | Status: ${s.status}`);
                    });
                    duplicatesFound = true;
                } else {
                    console.log(`   ✅ "${name}" - Unique`);
                }
            });
            
            console.log();
        });
        
        if (!duplicatesFound) {
            console.log('✅ No duplicate strategy names found!\n');
            console.log('📌 Validation is working correctly.\n');
        } else {
            console.log('⚠️  Duplicates detected! These may have been created before validation was added.\n');
            console.log('💡 Recommendation:');
            console.log('   1. Manually review duplicate strategies');
            console.log('   2. Delete unwanted duplicates via UI or database');
            console.log('   3. Current validation will prevent new duplicates\n');
        }
        
        // Check if compound index exists
        console.log('📇 Checking Database Indexes:');
        const indexes = await Strategy.collection.getIndexes();
        console.log('   Current indexes:');
        Object.keys(indexes).forEach(indexName => {
            console.log(`      - ${indexName}`);
        });
        
        const hasCompoundIndex = Object.keys(indexes).some(key => 
            key.includes('userId') && key.includes('name')
        );
        
        if (hasCompoundIndex) {
            console.log('   ✅ Compound index (userId + name) exists - Database-level duplicate prevention active\n');
        } else {
            console.log('   ⚠️  No compound index found - Only application-level validation active\n');
            console.log('   💡 Add compound index for extra protection:');
            console.log('      await Strategy.collection.createIndex({ userId: 1, name: 1 }, { unique: true });\n');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

strategyConnection.once('open', () => {
    console.log('🔗 Connected to strategy database\n');
    checkDuplicateStrategies();
});

strategyConnection.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
});
