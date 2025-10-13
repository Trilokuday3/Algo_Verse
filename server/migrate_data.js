/**
 * Data Migration Script
 * 
 * This script migrates data from the old single database (Capstone_Project)
 * to the new three-database architecture:
 * - user_db: User authentication and profiles
 * - strategy_db: All strategies
 * - credentials_db: Encrypted broker credentials
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Old database connection
const OLD_DB_URI = process.env.MONGO_URI;

// New database connections
const MONGO_USER_URI = process.env.MONGO_USER_URI;
const MONGO_STRATEGY_URI = process.env.MONGO_STRATEGY_URI;
const MONGO_CREDENTIALS_URI = process.env.MONGO_CREDENTIALS_URI;

// Old User Schema (from the previous structure)
const oldUserSchema = new mongoose.Schema({
    email: String,
    password: String,
    firstName: String,
    lastName: String,
    phone: String,
    broker: String,
    clientId: String,
    accessToken: String,
    brokerUsername: String,
    brokerPassword: String,
    totpSecret: String,
    apiKey: String,
    apiSecret: String,
    strategies: [{
        name: String,
        code: String,
        status: { type: String, default: 'Idle' },
        containerId: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

// New Schemas
const newUserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    phone: String
}, { timestamps: true });

const strategySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    status: { type: String, default: 'Idle' },
    containerId: String
}, { timestamps: true });

// Compound index: unique strategy name per user
strategySchema.index({ userId: 1, name: 1 }, { unique: true });

const credentialsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    broker: { 
        type: String, 
        enum: ['TradeHull', 'Zerodha', 'AngelOne', 'Upstox', 'Fyers', 'AliceBlue'],
        default: 'TradeHull'
    },
    clientId: String,
    accessToken: String,
    brokerUsername: String,
    brokerPassword: String,
    totpSecret: String,
    apiKey: String,
    apiSecret: String
}, { timestamps: true });

async function migrateData() {
    let oldConnection = null;
    let userConnection = null;
    let strategyConnection = null;
    let credentialsConnection = null;

    try {
        console.log('🚀 Starting data migration...\n');

        // Connect to old database
        console.log('📡 Connecting to old database (Capstone_Project)...');
        oldConnection = await mongoose.createConnection(OLD_DB_URI);
        console.log('✓ Connected to old database\n');

        // Connect to new databases
        console.log('📡 Connecting to new databases...');
        userConnection = await mongoose.createConnection(MONGO_USER_URI);
        console.log('✓ Connected to user_db');
        
        strategyConnection = await mongoose.createConnection(MONGO_STRATEGY_URI);
        console.log('✓ Connected to strategy_db');
        
        credentialsConnection = await mongoose.createConnection(MONGO_CREDENTIALS_URI);
        console.log('✓ Connected to credentials_db\n');

        // Create models
        const OldUser = oldConnection.model('User', oldUserSchema);
        const NewUser = userConnection.model('User', newUserSchema);
        const Strategy = strategyConnection.model('Strategy', strategySchema);
        const Credentials = credentialsConnection.model('Credentials', credentialsSchema);

        // Fetch all users from old database
        console.log('📊 Fetching users from old database...');
        const oldUsers = await OldUser.find({});
        console.log(`Found ${oldUsers.length} users to migrate\n`);

        if (oldUsers.length === 0) {
            console.log('⚠️  No users found in old database. Nothing to migrate.');
            return;
        }

        // Migration counters
        let usersCreated = 0;
        let usersSkipped = 0;
        let strategiesCreated = 0;
        let credentialsCreated = 0;
        let errors = [];

        // Migrate each user
        for (const oldUser of oldUsers) {
            try {
                console.log(`\n👤 Migrating user: ${oldUser.email}`);

                // Check if user already exists in new database
                const existingUser = await NewUser.findOne({ email: oldUser.email });
                
                let newUserId;
                if (existingUser) {
                    console.log('   ⚠️  User already exists in new database, using existing ID');
                    newUserId = existingUser._id;
                    usersSkipped++;
                } else {
                    // 1. Migrate user data (authentication + profile only)
                    const newUser = new NewUser({
                        email: oldUser.email,
                        password: oldUser.password, // Already hashed
                        firstName: oldUser.firstName || '',
                        lastName: oldUser.lastName || '',
                        phone: oldUser.phone || ''
                    });
                    await newUser.save();
                    newUserId = newUser._id;
                    usersCreated++;
                    console.log('   ✓ User profile migrated to user_db');
                }

                // 2. Migrate strategies
                if (oldUser.strategies && oldUser.strategies.length > 0) {
                    console.log(`   📊 Migrating ${oldUser.strategies.length} strategies...`);
                    
                    for (const oldStrategy of oldUser.strategies) {
                        try {
                            // Check if strategy already exists
                            const existingStrategy = await Strategy.findOne({
                                userId: newUserId,
                                name: oldStrategy.name
                            });

                            if (existingStrategy) {
                                console.log(`      ⚠️  Strategy "${oldStrategy.name}" already exists, skipping`);
                                continue;
                            }

                            const newStrategy = new Strategy({
                                userId: newUserId,
                                name: oldStrategy.name,
                                code: oldStrategy.code,
                                status: oldStrategy.status || 'Idle',
                                containerId: oldStrategy.containerId || null,
                                createdAt: oldStrategy.createdAt || new Date()
                            });
                            await newStrategy.save();
                            strategiesCreated++;
                            console.log(`      ✓ Strategy "${oldStrategy.name}" migrated`);
                        } catch (stratErr) {
                            console.error(`      ✗ Error migrating strategy "${oldStrategy.name}":`, stratErr.message);
                            errors.push(`Strategy "${oldStrategy.name}" for user ${oldUser.email}: ${stratErr.message}`);
                        }
                    }
                }

                // 3. Migrate credentials (if any exist)
                const hasCredentials = oldUser.clientId || oldUser.accessToken || 
                                      oldUser.brokerUsername || oldUser.brokerPassword ||
                                      oldUser.totpSecret || oldUser.apiKey || oldUser.apiSecret;

                if (hasCredentials) {
                    console.log('   🔑 Migrating credentials...');
                    
                    // Check if credentials already exist
                    const existingCredentials = await Credentials.findOne({ userId: newUserId });
                    
                    if (existingCredentials) {
                        console.log('      ⚠️  Credentials already exist, skipping');
                    } else {
                        const newCredentials = new Credentials({
                            userId: newUserId,
                            broker: oldUser.broker || 'TradeHull',
                            clientId: oldUser.clientId || null,
                            accessToken: oldUser.accessToken || null,
                            brokerUsername: oldUser.brokerUsername || null,
                            brokerPassword: oldUser.brokerPassword || null,
                            totpSecret: oldUser.totpSecret || null,
                            apiKey: oldUser.apiKey || null,
                            apiSecret: oldUser.apiSecret || null
                        });
                        await newCredentials.save();
                        credentialsCreated++;
                        console.log('      ✓ Credentials migrated to credentials_db');
                    }
                }

                console.log(`   ✅ User ${oldUser.email} migration complete!`);

            } catch (userErr) {
                console.error(`   ✗ Error migrating user ${oldUser.email}:`, userErr.message);
                errors.push(`User ${oldUser.email}: ${userErr.message}`);
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`✓ Users created:        ${usersCreated}`);
        console.log(`⚠️  Users skipped:       ${usersSkipped} (already existed)`);
        console.log(`✓ Strategies created:   ${strategiesCreated}`);
        console.log(`✓ Credentials created:  ${credentialsCreated}`);
        console.log(`✗ Errors encountered:   ${errors.length}`);
        console.log('='.repeat(60));

        if (errors.length > 0) {
            console.log('\n⚠️  ERRORS ENCOUNTERED:');
            errors.forEach((err, idx) => {
                console.log(`${idx + 1}. ${err}`);
            });
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Verify data in MongoDB Atlas dashboard');
        console.log('   2. Test your application with the new database structure');
        console.log('   3. Once verified, you can safely keep or delete the old Capstone_Project database');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        // Close all connections
        console.log('\n🔌 Closing database connections...');
        if (oldConnection) await oldConnection.close();
        if (userConnection) await userConnection.close();
        if (strategyConnection) await strategyConnection.close();
        if (credentialsConnection) await credentialsConnection.close();
        console.log('✓ All connections closed');
        
        process.exit(0);
    }
}

// Run migration
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║         DATA MIGRATION TO NEW DATABASE ARCHITECTURE       ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

migrateData().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
