const mongoose = require('mongoose');
require('dotenv').config();

// Connect to credentials database
const credentialsConnection = mongoose.createConnection(process.env.MONGO_CREDENTIALS_URI);

// Old schema (single credential per user)
const oldCredentialsSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    broker: String,
    clientId: String,
    accessToken: String,
    brokerUsername: String,
    brokerPassword: String,
    totpSecret: String,
    apiKey: String,
    apiSecret: String
}, { collection: 'credentials' });

async function migrateCredentials() {
    console.log('🔄 Starting credentials migration to multi-broker structure...\n');
    
    try {
        const OldCredentials = credentialsConnection.model('OldCredentials', oldCredentialsSchema);
        
        // Get all existing credentials
        const allCredentials = await OldCredentials.find({});
        console.log(`📊 Found ${allCredentials.length} existing credential documents`);
        
        if (allCredentials.length === 0) {
            console.log('✅ No credentials to migrate. Database is ready for multi-broker structure.');
            process.exit(0);
        }
        
        // Drop the unique index on userId only (if exists)
        try {
            await OldCredentials.collection.dropIndex('userId_1');
            console.log('✅ Dropped old userId unique index');
        } catch (err) {
            console.log('ℹ️  No userId index to drop (expected for new installations)');
        }
        
        // Create new compound unique index (userId + broker)
        await OldCredentials.collection.createIndex(
            { userId: 1, broker: 1 }, 
            { unique: true }
        );
        console.log('✅ Created compound unique index on userId + broker\n');
        
        console.log('📋 Existing credentials structure:');
        allCredentials.forEach((cred, idx) => {
            console.log(`   ${idx + 1}. User: ${cred.userId}, Broker: ${cred.broker || 'dhan (default)'}`);
        });
        
        // Update documents to ensure broker field is set
        let updated = 0;
        for (const cred of allCredentials) {
            if (!cred.broker || cred.broker === '') {
                await OldCredentials.updateOne(
                    { _id: cred._id },
                    { $set: { broker: 'dhan' } }
                );
                updated++;
            }
        }
        
        if (updated > 0) {
            console.log(`\n✅ Updated ${updated} documents to set default broker to 'dhan'`);
        }
        
        console.log('\n✅ Migration completed successfully!');
        console.log('\n📌 Summary:');
        console.log('   - Users can now have up to 4 different broker credentials');
        console.log('   - Each broker per user is unique (no duplicates)');
        console.log('   - Allowed brokers: dhan, zerodha, upstox, angelone');
        console.log('   - Updating existing broker credentials will replace old ones\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

// Run migration
credentialsConnection.once('open', () => {
    console.log('🔗 Connected to credentials database\n');
    migrateCredentials();
});

credentialsConnection.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
});
