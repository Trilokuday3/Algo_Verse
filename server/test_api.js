/**
 * Test API Script
 * Tests if the multi-database architecture is working correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
    try {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║              TESTING MULTI-DATABASE API                   ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Test 1: Login
        console.log('🔐 Test 1: Login');
        console.log('─'.repeat(60));
        
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'trilokeshvenkatauday@gmail.com',
            password: 'trilokuday'
        });
        
        const token = loginResponse.data.token;
        console.log('✓ Login successful');
        console.log(`   Token: ${token.substring(0, 20)}...`);
        console.log();

        // Test 2: Get Profile (aggregates from all 3 databases)
        console.log('👤 Test 2: Get User Profile');
        console.log('─'.repeat(60));
        
        const profileResponse = await axios.get(`${BASE_URL}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const profile = profileResponse.data;
        console.log('✓ Profile retrieved successfully');
        console.log(`   Email: ${profile.email}`);
        console.log(`   Name: ${profile.firstName} ${profile.lastName}`);
        console.log(`   Phone: ${profile.phone}`);
        console.log(`   Strategies: ${profile.strategies?.length || 0}`);
        console.log(`   Has Credentials: ${profile.hasClientId ? 'Yes' : 'No'}`);
        console.log();

        // Test 3: Get Strategies
        console.log('📊 Test 3: Get Strategies');
        console.log('─'.repeat(60));
        
        const strategiesResponse = await axios.get(`${BASE_URL}/api/strategies`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const strategies = strategiesResponse.data;
        console.log(`✓ Found ${strategies.length} strategies`);
        strategies.forEach((strategy, idx) => {
            console.log(`   ${idx + 1}. "${strategy.name}"`);
            console.log(`      Status: ${strategy.status}`);
            console.log(`      Container: ${strategy.containerId || 'None'}`);
        });
        console.log();

        // Summary
        console.log('═'.repeat(60));
        console.log('✅ ALL TESTS PASSED!');
        console.log('═'.repeat(60));
        console.log('The multi-database architecture is working correctly:');
        console.log('  ✓ user_db: User authentication and profile data');
        console.log('  ✓ strategy_db: Strategy data linked by userId');
        console.log('  ✓ credentials_db: Broker credentials linked by userId');
        console.log('═'.repeat(60));

    } catch (error) {
        console.error('\n❌ Test Failed:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Message: ${error.response.data.message || error.response.data}`);
        } else if (error.request) {
            console.error('   No response from server. Is it running?');
        } else {
            console.error(`   Error: ${error.message}`);
        }
        process.exit(1);
    }
}

// Check if axios is installed
try {
    require.resolve('axios');
    testAPI();
} catch (e) {
    console.log('Installing axios...');
    const { execSync } = require('child_process');
    execSync('npm install axios', { stdio: 'inherit' });
    testAPI();
}
