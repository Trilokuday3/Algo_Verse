require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

const CREDENTIALS_DB_URI = process.env.MONGO_CREDENTIALS_URI;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Decrypt function
function decrypt(encryptedText) {
    if (!encryptedText) return '';
    try {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedData = Buffer.from(parts.join(':'), 'hex');
        // Create key from the string (same as server does)
        const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        return `[DECRYPT ERROR: ${error.message}]`;
    }
}

async function checkCredentials() {
    try {
        await mongoose.connect(CREDENTIALS_DB_URI);
        console.log('✅ Connected to credentials database');

        const Credentials = mongoose.model('Credentials', new mongoose.Schema({
            userId: String,
            broker: String,
            clientId: String,
            accessToken: String,
        }), 'credentials');

        const credentials = await Credentials.findOne({ broker: 'dhan' });
        
        if (!credentials) {
            console.log('❌ No Dhan credentials found in database');
            process.exit(1);
        }

        console.log('\n📊 Dhan Credentials Status:');
        console.log('userId:', credentials.userId);
        console.log('broker:', credentials.broker);
        console.log('\n🔐 Encrypted values:');
        console.log('clientId (encrypted):', credentials.clientId ? `${credentials.clientId.substring(0, 50)}...` : 'EMPTY');
        console.log('accessToken (encrypted):', credentials.accessToken ? `${credentials.accessToken.substring(0, 50)}...` : 'EMPTY');
        
        console.log('\n🔓 Decrypted values:');
        const decryptedClientId = decrypt(credentials.clientId);
        const decryptedToken = decrypt(credentials.accessToken);
        
        console.log('clientId (decrypted):', decryptedClientId || 'EMPTY');
        console.log('clientId length:', decryptedClientId.length);
        console.log('accessToken (decrypted):', decryptedToken ? `${decryptedToken.substring(0, 50)}...` : 'EMPTY');
        console.log('accessToken length:', decryptedToken.length);
        
        // Decode JWT token
        if (decryptedToken) {
            try {
                const parts = decryptedToken.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    const expDate = new Date(payload.exp * 1000);
                    const now = new Date();
                    
                    console.log('\n📅 Token Information:');
                    console.log('Expires at:', expDate.toLocaleString());
                    console.log('Current time:', now.toLocaleString());
                    console.log('Token status:', expDate > now ? '✅ VALID' : '❌ EXPIRED');
                    
                    if (expDate < now) {
                        const hoursSinceExpiry = Math.floor((now - expDate) / (1000 * 60 * 60));
                        console.log(`Token expired ${hoursSinceExpiry} hours ago`);
                    }
                }
            } catch (e) {
                console.log('⚠️ Could not decode JWT token');
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkCredentials();
