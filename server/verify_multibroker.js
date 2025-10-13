const mongoose = require('mongoose');
require('dotenv').config();

const credentialsConnection = mongoose.createConnection(process.env.MONGO_CREDENTIALS_URI);

const credentialsSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    broker: String,
    clientId: String,
    accessToken: String,
    brokerUsername: String,
    brokerPassword: String,
    totpSecret: String,
    apiKey: String,
    apiSecret: String
}, { timestamps: true });

async function verifyMultiBrokerSetup() {
    console.log('🔍 Verifying Multi-Broker System Setup\n');
    
    try {
        const Credentials = credentialsConnection.model('Credentials', credentialsSchema);
        
        // Get all credentials
        const allCreds = await Credentials.find({});
        
        console.log('📊 Database Status:');
        console.log(`   Total credential documents: ${allCreds.length}\n`);
        
        // Group by user
        const userGroups = {};
        allCreds.forEach(cred => {
            const userId = cred.userId.toString();
            if (!userGroups[userId]) {
                userGroups[userId] = [];
            }
            userGroups[userId].push(cred.broker);
        });
        
        console.log('👥 Credentials per User:');
        Object.keys(userGroups).forEach((userId, idx) => {
            const brokers = userGroups[userId];
            console.log(`   User ${idx + 1} (${userId.substring(0, 8)}...):`);
            console.log(`      Brokers: ${brokers.join(', ')}`);
            console.log(`      Count: ${brokers.length}/4`);
            
            if (brokers.length > 4) {
                console.log(`      ⚠️  WARNING: User has more than 4 brokers!`);
            } else if (brokers.length === 4) {
                console.log(`      ✅ At maximum capacity`);
            } else {
                console.log(`      ℹ️  Can add ${4 - brokers.length} more broker(s)`);
            }
            console.log();
        });
        
        // Check for duplicates
        console.log('🔍 Checking for Duplicate Brokers:');
        let duplicatesFound = false;
        Object.keys(userGroups).forEach((userId, idx) => {
            const brokers = userGroups[userId];
            const uniqueBrokers = [...new Set(brokers)];
            
            if (brokers.length !== uniqueBrokers.length) {
                console.log(`   ❌ User ${idx + 1}: Has duplicate brokers!`);
                console.log(`      All: ${brokers.join(', ')}`);
                console.log(`      Unique: ${uniqueBrokers.join(', ')}`);
                duplicatesFound = true;
            }
        });
        
        if (!duplicatesFound) {
            console.log('   ✅ No duplicates found - Each user has unique brokers');
        }
        console.log();
        
        // Check broker values
        const allowedBrokers = ['dhan', 'zerodha', 'upstox', 'angelone'];
        console.log('🏦 Broker Validation:');
        console.log(`   Allowed brokers: ${allowedBrokers.join(', ')}\n`);
        
        let invalidBrokersFound = false;
        allCreds.forEach((cred, idx) => {
            if (!allowedBrokers.includes(cred.broker)) {
                console.log(`   ⚠️  Credential ${idx + 1}: Invalid broker "${cred.broker}"`);
                console.log(`      User: ${cred.userId}`);
                console.log(`      Suggestion: Update to one of: ${allowedBrokers.join(', ')}`);
                invalidBrokersFound = true;
            }
        });
        
        if (!invalidBrokersFound) {
            console.log('   ✅ All brokers are valid');
        }
        console.log();
        
        // Check indexes
        console.log('📇 Index Verification:');
        const indexes = await Credentials.collection.getIndexes();
        console.log('   Existing indexes:');
        Object.keys(indexes).forEach(indexName => {
            console.log(`      - ${indexName}: ${JSON.stringify(indexes[indexName])}`);
        });
        
        const hasCompoundIndex = Object.keys(indexes).some(key => 
            indexes[key].userId && indexes[key].broker
        );
        
        if (hasCompoundIndex) {
            console.log('   ✅ Compound index (userId + broker) exists');
        } else {
            console.log('   ⚠️  Compound index NOT found - Run migration!');
        }
        console.log();
        
        // Summary
        console.log('📋 Summary:');
        console.log(`   ✅ Total users with credentials: ${Object.keys(userGroups).length}`);
        console.log(`   ✅ Total broker configurations: ${allCreds.length}`);
        console.log(`   ✅ Average brokers per user: ${(allCreds.length / Object.keys(userGroups).length).toFixed(1)}`);
        console.log('\n✨ Multi-broker system is ready!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification error:', error);
        process.exit(1);
    }
}

credentialsConnection.once('open', () => {
    console.log('🔗 Connected to credentials database\n');
    verifyMultiBrokerSetup();
});

credentialsConnection.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
});
