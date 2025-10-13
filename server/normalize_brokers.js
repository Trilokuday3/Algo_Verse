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
});

async function normalizeBrokerNames() {
    console.log('🔄 Normalizing broker names to lowercase...\n');
    
    try {
        const Credentials = credentialsConnection.model('Credentials', credentialsSchema);
        
        // Get all credentials
        const allCreds = await Credentials.find({});
        console.log(`📊 Found ${allCreds.length} credential documents\n`);
        
        let updated = 0;
        
        for (const cred of allCreds) {
            const normalizedBroker = cred.broker.toLowerCase();
            
            if (cred.broker !== normalizedBroker) {
                console.log(`   📝 Updating: "${cred.broker}" → "${normalizedBroker}"`);
                console.log(`      User: ${cred.userId}`);
                
                await Credentials.updateOne(
                    { _id: cred._id },
                    { $set: { broker: normalizedBroker } }
                );
                
                updated++;
            }
        }
        
        if (updated === 0) {
            console.log('✅ All broker names are already normalized');
        } else {
            console.log(`\n✅ Normalized ${updated} broker name(s)`);
        }
        
        // Verify
        const afterUpdate = await Credentials.find({});
        console.log('\n📋 Current Broker Names:');
        afterUpdate.forEach(cred => {
            console.log(`   - ${cred.broker} (User: ${cred.userId.toString().substring(0, 8)}...)`);
        });
        
        console.log('\n✨ Broker name normalization complete!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Normalization error:', error);
        process.exit(1);
    }
}

credentialsConnection.once('open', () => {
    console.log('🔗 Connected to credentials database\n');
    normalizeBrokerNames();
});

credentialsConnection.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
});
