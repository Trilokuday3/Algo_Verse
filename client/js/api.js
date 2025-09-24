const API_BASE_URL = 'http://localhost:3000';

/**
 * Retrieves the JWT token from browser's local storage.
 * @returns {string|null} The token, or null if not found.
 */
function getToken() {
    return localStorage.getItem('token');
}

// =================================================================
// --- AUTHENTICATION ---
// =================================================================

/**
 * Handles both login and registration via a single endpoint.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} The server's response.
 */
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

// =================================================================
// --- CREDENTIALS ---
// =================================================================

/**
 * Saves all user credentials to the backend.
 * @param {Object} credentials - An object containing clientId, accessToken, etc.
 * @returns {Promise<Object>} The server's response.
 */
async function saveCredentials(credentials) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/credentials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(credentials),
        });
        return await response.json();
    } catch (error) {
        return { message: 'Error: Could not connect to the server.' };
    }
}

// =================================================================
// --- STRATEGY MANAGEMENT ---
// =================================================================

/**
 * Fetches all strategies for the logged-in user.
 * @returns {Promise<Array>} A list of the user's strategies.
 */
async function getStrategies() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/strategies`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        return [];
    }
}

/**
 * Fetches a single strategy by its unique ID.
 * @param {string} strategyId - The ID of the strategy to fetch.
 * @returns {Promise<Object>} The strategy data.
 */
async function getStrategyById(strategyId) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/strategies/${strategyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
}

/**
 * Saves a new strategy to the user's account.
 * @param {string} name - The name of the new strategy.
 * @param {string} code - The Python code for the strategy.
 * @returns {Promise<Object>} The server's response.
 */
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
        return { message: 'Error: Could not connect to the server.' };
    }
}

/**
 * Updates an existing strategy.
 * @param {string} strategyId - The ID of the strategy to update.
 * @param {string} name - The new name for the strategy.
 * @param {string} code - The new code for the strategy.
 * @returns {Promise<Object>} The server's response.
 */
async function updateStrategy(strategyId, name, code) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/strategies/${strategyId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, code }),
    });
    return await response.json();
}

/**
 * Deletes a strategy from the user's account.
 * @param {string} strategyId - The ID of the strategy to delete.
 * @returns {Promise<Object>} The server's response.
 */
async function deleteStrategy(strategyId) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/strategies/${strategyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
}

/**
 * Sends a command to start a strategy.
 * @param {string} strategyId - The ID of the strategy to start.
 * @returns {Promise<Object>} The server's response.
 */
async function startStrategy(strategyId) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/strategies/${strategyId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
}

/**
 * Sends a command to stop a strategy.
 * @param {string} strategyId - The ID of the strategy to stop.
 * @returns {Promise<Object>} The server's response.
 */
async function stopStrategy(strategyId) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/strategies/${strategyId}/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
}

/**
 * Sends a command to pause a strategy.
 * @param {string} strategyId - The ID of the strategy to pause.
 * @returns {Promise<Object>} The server's response.
 */
async function pauseStrategy(strategyId) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/strategies/${strategyId}/pause`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
}

/**
 * Sends a command to resume a strategy.
 * @param {string} strategyId - The ID of the strategy to resume.
 * @returns {Promise<Object>} The server's response.
 */
async function resumeStrategy(strategyId) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/strategies/${strategyId}/resume`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
}

// =================================================================
// --- CODE EXECUTION (from Terminal) ---
// =================================================================

/**
 * Sends code from the terminal to be run immediately.
 * @param {string} code - The Python code to run.
 * @returns {Promise<Object>} The server's response with the code output.
 */
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

