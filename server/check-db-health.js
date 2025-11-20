/**
 * Database Connection Health Checker
 * Verifies MongoDB connections and diagnoses issues
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

const databases = {
    user_db: `${MONGODB_URI}/user_db`,
    strategy_db: `${MONGODB_URI}/strategy_db`,
    credentials_db: `${MONGODB_URI}/credentials_db`
};

class DatabaseHealthChecker {
    constructor() {
        this.results = [];
    }

    async checkConnection(name, uri) {
        console.log(`\n🔍 Checking ${name}...`);
        
        try {
            const conn = await mongoose.createConnection(uri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 5000,
            }).asPromise();

            // Test basic operation
            const collections = await conn.db.listCollections().toArray();
            
            await conn.close();

            this.results.push({
                name,
                status: 'CONNECTED',
                collections: collections.length,
                uri: uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') // Hide password
            });

            console.log(`✅ ${name} - Connected (${collections.length} collections)`);
            return true;

        } catch (error) {
            this.results.push({
                name,
                status: 'FAILED',
                error: error.message,
                uri: uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')
            });

            console.log(`❌ ${name} - Failed: ${error.message}`);
            return false;
        }
    }

    async checkAllDatabases() {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║   DATABASE CONNECTION HEALTH CHECK                        ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        
        for (const [name, uri] of Object.entries(databases)) {
            await this.checkConnection(name, uri);
        }

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 DATABASE HEALTH SUMMARY');
        console.log('='.repeat(60));

        const connected = this.results.filter(r => r.status === 'CONNECTED').length;
        const failed = this.results.filter(r => r.status === 'FAILED').length;

        console.log(`Total Databases: ${this.results.length}`);
        console.log(`✅ Connected: ${connected}`);
        console.log(`❌ Failed: ${failed}`);
        console.log('='.repeat(60));

        console.log('\n📋 Detailed Results:\n');
        this.results.forEach(result => {
            console.log(`Database: ${result.name}`);
            console.log(`Status: ${result.status}`);
            console.log(`URI: ${result.uri}`);
            
            if (result.collections !== undefined) {
                console.log(`Collections: ${result.collections}`);
            }
            
            if (result.error) {
                console.log(`Error: ${result.error}`);
            }
            
            console.log('');
        });

        console.log('='.repeat(60));

        if (failed === 0) {
            console.log('🎉 All databases are healthy and connected!');
        } else {
            console.log(`⚠️  ${failed} database(s) have connection issues.`);
            console.log('\nPossible solutions:');
            console.log('1. Check MongoDB is running: sudo systemctl status mongod');
            console.log('2. Verify connection string in .env file');
            console.log('3. Check firewall settings');
            console.log('4. Ensure MongoDB accepts connections on the configured port');
        }

        console.log('='.repeat(60) + '\n');
    }
}

// Run health check
const checker = new DatabaseHealthChecker();
checker.checkAllDatabases()
    .then(() => {
        console.log('✅ Health check completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Health check failed:', error);
        process.exit(1);
    });
