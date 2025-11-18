// Test history API endpoint
const email = 'your-actual-email@example.com'; // Change this
const password = 'your-actual-password'; // Change this

async function testHistory() {
    try {
        console.log('🔐 Logging in...');
        const loginRes = await fetch('http://localhost:3000/api/auth/login-or-register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const loginData = await loginRes.json();
        if (!loginData.token) {
            console.error('❌ Login failed:', loginData.message);
            return;
        }
        
        console.log('✅ Login successful');
        console.log('Token:', loginData.token.substring(0, 20) + '...');
        
        console.log('\n📋 Fetching history...');
        const historyRes = await fetch('http://localhost:3000/api/strategy/history/all?limit=200', {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        
        const historyData = await historyRes.json();
        
        console.log('\n📊 History Response:');
        console.log('Status:', historyRes.status);
        console.log('Success:', historyData.success);
        console.log('Total runs:', historyData.total);
        console.log('Runs returned:', historyData.runs?.length || 0);
        
        if (historyData.runs && historyData.runs.length > 0) {
            console.log('\n📝 Sample run:');
            console.log(historyData.runs[0]);
        } else {
            console.log('\n✅ No run history found (this is normal if you haven\'t run any strategies yet)');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testHistory();
