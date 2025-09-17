const API_BASE_URL = 'http://localhost:3000';

function getToken() {
    return localStorage.getItem('token');
}

async function loginOrRegister(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login-or-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return await response.json();
    } catch (error) {
        return { message: 'Error: Could not connect to the server.' };
    }
}

async function saveCredentials(clientId, accessToken) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/credentials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ clientId, accessToken }),
        });
        return await response.json();
    } catch (error) {
        console.error("Save credentials request failed:", error);
        return { message: 'Error: Could not connect to the server.' };
    }
}

// --- NEW: Function to get all strategies ---
async function getStrategies() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/strategies`, {
            headers: { 
                'Authorization': `Bearer ${token}` 
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Get strategies request failed:", error);
        return []; // Return an empty array on failure
    }
}

// --- NEW: Function to save a strategy ---
async function saveStrategy(name, code) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/strategies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, code }),
        });
        return await response.json();
    } catch (error) {
        console.error("Save strategy request failed:", error);
        return { message: 'Error: Could not connect to the server.' };
    }
}

async function runStrategy(code) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code }),
        });
        return await response.json();
    } catch (error) {
        console.error("Run strategy request failed:", error);
        return { output: 'Error: Could not connect to the server.' };
    }
}