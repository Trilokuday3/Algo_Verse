/**
 * Encrypt Existing Strategy Codes
 * 
 * This script encrypts all existing strategy codes in the database
 * that are currently stored in plain text.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { encrypt, decrypt } = require('./src/services/crypto.service');

const MONGO_STRATEGY_URI = process.env.MONGO_STRATEGY_URI;

async function encryptExistingCodes() {
    try {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║         ENCRYPTING EXISTING STRATEGY CODES                ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Connect to strategy database
        console.log('📡 Connecting to strategy database...');
        const conn = await mongoose.createConnection(MONGO_STRATEGY_URI).asPromise();
        console.log('✓ Connected\n');

        // Get all strategies
        const strategies = await conn.db.collection('strategies').find({}).toArray();
        console.log(`📊 Found ${strategies.length} strategies\n`);

        let encrypted = 0;
        let alreadyEncrypted = 0;
        let errors = 0;

        for (const strategy of strategies) {
            try {
                // Check if code is already encrypted (contains ':' separator)
                const isEncrypted = strategy.code && strategy.code.includes(':') && 
                                   strategy.code.split(':').length === 2;
                
                if (isEncrypted) {
                    // Verify it's actually encrypted by trying to decrypt
                    try {
                        decrypt(strategy.code);
                        console.log(`✓ "${strategy.name}" - Already encrypted`);
                        alreadyEncrypted++;
                    } catch (e) {
                        // Not properly encrypted, encrypt it
                        const encryptedCode = encrypt(strategy.code);
                        await conn.db.collection('strategies').updateOne(
                            { _id: strategy._id },
                            { $set: { code: encryptedCode } }
                        );
                        console.log(`🔒 "${strategy.name}" - Encrypted (was corrupted)`);
                        encrypted++;
                    }
                } else {
                    // Plain text, encrypt it
                    const encryptedCode = encrypt(strategy.code);
                    await conn.db.collection('strategies').updateOne(
                        { _id: strategy._id },
                        { $set: { code: encryptedCode } }
                    );
                    console.log(`🔒 "${strategy.name}" - Encrypted`);
                    encrypted++;
                }
            } catch (error) {
                console.error(`❌ Error processing "${strategy.name}":`, error.message);
                errors++;
            }
        }

        // Summary
        console.log('\n' + '═'.repeat(60));
        console.log('📊 ENCRYPTION SUMMARY');
        console.log('═'.repeat(60));
        console.log(`Total strategies:       ${strategies.length}`);
        console.log(`✓ Encrypted:            ${encrypted}`);
        console.log(`✓ Already encrypted:    ${alreadyEncrypted}`);
        console.log(`✗ Errors:               ${errors}`);
        console.log('═'.repeat(60));

        if (errors === 0) {
            console.log('\n✅ All strategy codes are now encrypted!');
            console.log('🔒 Hosting department cannot view user strategies.');
            console.log('💡 Users can still view and edit their strategies normally.');
        } else {
            console.log('\n⚠️  Some errors occurred. Please check the logs above.');
        }

        // Close connection
        await conn.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

encryptExistingCodes();
