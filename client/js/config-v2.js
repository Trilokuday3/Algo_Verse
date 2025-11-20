/**
 * Environment Configuration v2
 * This file manages API endpoints and WebSocket URLs for different environments
 */

// Determine environment based on hostname or manual override
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Configuration object
const CONFIG = {
    development: {
        API_BASE_URL: 'http://localhost:3000',
        WS_URL: 'http://localhost:3000'
    },
    production: {
        API_BASE_URL: 'http://13.233.57.134:3000',
        WS_URL: 'http://13.233.57.134:3000'
    }
};

// Export the active configuration
const ENV = isDevelopment ? CONFIG.development : CONFIG.production;

console.log(`🌍 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(`📡 API Base URL: ${ENV.API_BASE_URL}`);
console.log(`🔌 WebSocket URL: ${ENV.WS_URL}`);

// Make it globally accessible
window.APP_CONFIG = ENV;
