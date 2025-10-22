const getCredentialsModel = require('../models/Credentials.model');
const cryptoService = require('../services/crypto.service');
const axios = require('axios');

// Broker API base URLs
const BROKER_APIS = {
    dhan: 'https://api.dhan.co/v2',  // Dhan uses v2 API
    zerodha: 'https://api.kite.trade',
    upstox: 'https://api.upstox.com/v2',
    angelone: 'https://apiconnect.angelbroking.com'
};

// Helper function to get user's broker credentials
async function getUserBrokerCredentials(userId, broker) {
    try {
        const Credentials = getCredentialsModel();
        console.log(`🔍 Looking for credentials - userId: ${userId}, broker: ${broker}`);
        
        const credentials = await Credentials.findOne({ userId, broker });
        
        if (!credentials) {
            console.error(`❌ No credentials found for broker: ${broker}`);
            return { error: `Credentials not found for broker: ${broker}. Please add ${broker} credentials in your profile.` };
        }

        console.log(`✅ Found credentials for broker: ${broker}`);
        console.log(`📝 Credentials clientId exists: ${!!credentials.clientId}`);
        console.log(`📝 Credentials accessToken exists: ${!!credentials.accessToken}`);
        console.log(`📝 ClientId length: ${credentials.clientId?.length || 0}`);
        console.log(`📝 AccessToken length: ${credentials.accessToken?.length || 0}`);
        
        // Check if credentials are empty
        if (!credentials.clientId || !credentials.accessToken) {
            console.error(`❌ Empty credentials for broker: ${broker}`);
            return { error: `Empty credentials for ${broker}. Please update your ${broker} credentials in the profile page.` };
        }
        
        // Try to decrypt credentials
        let decryptedClientId, decryptedAccessToken;
        try {
            decryptedClientId = cryptoService.decrypt(credentials.clientId);
            decryptedAccessToken = cryptoService.decrypt(credentials.accessToken);
            console.log(`✅ Credentials decrypted successfully`);
        } catch (decryptError) {
            console.error(`❌ Decryption error:`, decryptError.message);
            return { error: `Failed to decrypt ${broker} credentials. Please re-save your credentials in the profile page.` };
        }

        return {
            broker,
            clientId: decryptedClientId,
            accessToken: decryptedAccessToken
        };
    } catch (error) {
        console.error('❌ Error fetching broker credentials:', error);
        console.error('Error stack:', error.stack);
        return { error: error.message };
    }
}

// Helper function to make broker API calls
async function callBrokerAPI(broker, endpoint, credentials, method = 'GET', data = null) {
    try {
        const baseUrl = BROKER_APIS[broker];
        if (!baseUrl) {
            throw new Error(`Unsupported broker: ${broker}`);
        }

        console.log(`🌐 Calling ${broker} API: ${method} ${baseUrl}${endpoint}`);

        const config = {
            method,
            url: `${baseUrl}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Set authorization header based on broker
        if (broker === 'dhan') {
            // Dhan uses 'access-token' and 'client-id' headers
            config.headers['access-token'] = credentials.accessToken;
            config.headers['client-id'] = credentials.clientId || credentials.apiKey;
        } else {
            // Other brokers use Bearer token
            config.headers['Authorization'] = `Bearer ${credentials.accessToken}`;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            config.data = data;
        }

        const response = await axios(config);
        console.log(`✅ ${broker} API call successful`);
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data || error.message;
        console.error(`❌ ${broker} API call error:`, errorMsg);
        
        // Handle Dhan-specific "no data" responses - these are NOT errors
        if (broker === 'dhan' && error.response?.data) {
            const errorCode = error.response.data.errorCode;
            const errorType = error.response.data.errorType;
            
            // No holdings available
            if (errorCode === 'DH-1111' || errorType === 'HOLDING_ERROR') {
                console.log('ℹ️ Dhan API: No holdings available (this is normal, not an error)');
                return [];
            }
            
            // No orders available
            if (errorCode === 'DH-5555' || errorType === 'ORDER_ERROR') {
                console.log('ℹ️ Dhan API: No orders available (this is normal, not an error)');
                return [];
            }
            
            // No positions available
            if (errorCode === 'DH-3333' || errorType === 'POSITION_ERROR') {
                console.log('ℹ️ Dhan API: No positions available (this is normal, not an error)');
                return [];
            }
        }
        
        // Provide more helpful error messages
        if (error.response?.status === 400 && errorMsg.message?.includes('Authorization')) {
            throw new Error(`Invalid credentials for ${broker}. The token may be expired or for a different broker. Please update your ${broker} credentials.`);
        }
        
        if (error.response?.status === 401) {
            throw new Error(`Unauthorized: ${broker} token is invalid or expired. Please re-authenticate.`);
        }
        
        throw error;
    }
}

// Get holdings
exports.getHoldings = async (req, res) => {
    try {
        const { broker } = req.query;
        
        console.log(`📊 getHoldings called - broker: ${broker}, userId: ${req.userId}`);
        
        if (!broker) {
            return res.status(400).json({ error: 'Broker parameter is required' });
        }

        console.log('Step 1: Getting credentials...');
        const credentials = await getUserBrokerCredentials(req.userId, broker);
        
        if (credentials.error) {
            console.error(`❌ Credentials error: ${credentials.error}`);
            return res.status(404).json({ error: credentials.error });
        }
        
        console.log('✅ Step 1 Complete: Credentials obtained');

        let holdings = [];

        // Call appropriate broker API based on broker type
        switch (broker) {
            case 'dhan':
                console.log('🌐 Step 2: Calling Dhan holdings API...');
                console.log('API Endpoint: /holdings');
                console.log('Using credentials - clientId exists:', !!credentials.clientId);
                console.log('Using credentials - accessToken exists:', !!credentials.accessToken);
                
                try {
                    const dhanResponse = await callBrokerAPI(broker, '/holdings', credentials);
                    console.log('📦 Step 3: Dhan API Response received');
                    console.log('📦 Response type:', typeof dhanResponse);
                    console.log('📦 Is array?', Array.isArray(dhanResponse));
                    
                    if (dhanResponse && !Array.isArray(dhanResponse) && typeof dhanResponse === 'object') {
                        console.log('📦 Response keys:', Object.keys(dhanResponse));
                    }
                    
                    // Dhan returns data directly, not wrapped
                    holdings = Array.isArray(dhanResponse) ? dhanResponse : (dhanResponse.data || []);
                    console.log(`✅ Step 4: Holdings processed: ${holdings.length} items`);
                    
                    // Log first item structure if available
                    if (holdings.length > 0) {
                        console.log('📋 First holding sample:', holdings[0]);
                    }
                } catch (dhanError) {
                    console.error('❌ ========== DHAN API ERROR ==========');
                    console.error('❌ Error message:', dhanError.message);
                    console.error('❌ Error stack:', dhanError.stack);
                    if (dhanError.response) {
                        console.error('❌ Response status:', dhanError.response.status);
                        console.error('❌ Response data:', dhanError.response.data);
                        console.error('❌ Response headers:', dhanError.response.headers);
                    }
                    throw dhanError; // Re-throw to be caught by outer try-catch
                }
                break;
            
            case 'zerodha':
                const zerodhaResponse = await callBrokerAPI(broker, '/portfolio/holdings', credentials);
                holdings = zerodhaResponse.data || [];
                break;
            
            case 'upstox':
                const upstoxResponse = await callBrokerAPI(broker, '/portfolio/long-term-holdings', credentials);
                holdings = upstoxResponse.data || [];
                break;
            
            case 'angelone':
                const angelResponse = await callBrokerAPI(broker, '/rest/secure/angelbroking/portfolio/v1/getHolding', credentials, 'GET');
                holdings = angelResponse.data || [];
                break;
            
            default:
                return res.status(400).json({ error: 'Unsupported broker' });
        }

        res.json({ 
            success: true, 
            broker,
            holdings 
        });

    } catch (error) {
        console.error('❌ ========== HOLDINGS ENDPOINT ERROR ==========');
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error name:', error.name);
        
        if (error.response) {
            console.error('❌ HTTP Response Error:');
            console.error('   Status:', error.response.status);
            console.error('   Status Text:', error.response.statusText);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
            console.error('   Headers:', error.response.headers);
        }
        
        if (error.request) {
            console.error('❌ Request made but no response:', error.request);
        }
        
        console.error('='.repeat(50));
        
        res.status(500).json({ 
            error: 'Failed to fetch holdings', 
            message: error.message,
            details: error.response?.data || 'No additional details available'
        });
    }
};

// Get positions
exports.getPositions = async (req, res) => {
    try {
        const { broker } = req.query;
        
        if (!broker) {
            return res.status(400).json({ error: 'Broker parameter is required' });
        }

        const credentials = await getUserBrokerCredentials(req.userId, broker);
        
        if (credentials.error) {
            return res.status(404).json({ error: credentials.error });
        }

        let positions = [];

        switch (broker) {
            case 'dhan':
                const dhanResponse = await callBrokerAPI(broker, '/positions', credentials);
                // Dhan returns data directly
                positions = Array.isArray(dhanResponse) ? dhanResponse : (dhanResponse.data || []);
                break;
            
            case 'zerodha':
                const zerodhaResponse = await callBrokerAPI(broker, '/portfolio/positions', credentials);
                positions = zerodhaResponse.net || [];
                break;
            
            case 'upstox':
                const upstoxResponse = await callBrokerAPI(broker, '/portfolio/short-term-positions', credentials);
                positions = upstoxResponse.data || [];
                break;
            
            case 'angelone':
                const angelResponse = await callBrokerAPI(broker, '/rest/secure/angelbroking/order/v1/getPosition', credentials, 'GET');
                positions = angelResponse.data || [];
                break;
            
            default:
                return res.status(400).json({ error: 'Unsupported broker' });
        }

        res.json({ 
            success: true, 
            broker,
            positions 
        });

    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({ 
            error: 'Failed to fetch positions', 
            message: error.message 
        });
    }
};

// Get funds
exports.getFunds = async (req, res) => {
    try {
        const { broker } = req.query;
        
        if (!broker) {
            return res.status(400).json({ error: 'Broker parameter is required' });
        }

        const credentials = await getUserBrokerCredentials(req.userId, broker);
        
        if (credentials.error) {
            return res.status(404).json({ error: credentials.error });
        }

        let funds = {};

        switch (broker) {
            case 'dhan':
                const dhanResponse = await callBrokerAPI(broker, '/fundlimit', credentials);
                // Dhan returns fund data directly
                funds = dhanResponse.data || dhanResponse;
                funds = dhanResponse.data || {};
                break;
            
            case 'zerodha':
                const zerodhaResponse = await callBrokerAPI(broker, '/user/margins', credentials);
                funds = zerodhaResponse.equity || {};
                break;
            
            case 'upstox':
                const upstoxResponse = await callBrokerAPI(broker, '/user/get-funds-and-margin', credentials);
                funds = upstoxResponse.data || {};
                break;
            
            case 'angelone':
                const angelResponse = await callBrokerAPI(broker, '/rest/secure/angelbroking/user/v1/getRMS', credentials, 'GET');
                funds = angelResponse.data || {};
                break;
            
            default:
                return res.status(400).json({ error: 'Unsupported broker' });
        }

        res.json({ 
            success: true, 
            broker,
            funds 
        });

    } catch (error) {
        console.error('Error fetching funds:', error);
        res.status(500).json({ 
            error: 'Failed to fetch funds', 
            message: error.message 
        });
    }
};

// Get pending orders
exports.getPendingOrders = async (req, res) => {
    try {
        const { broker } = req.query;
        
        if (!broker) {
            return res.status(400).json({ error: 'Broker parameter is required' });
        }

        const credentials = await getUserBrokerCredentials(req.userId, broker);
        
        if (credentials.error) {
            return res.status(404).json({ error: credentials.error });
        }

        let orders = [];

        switch (broker) {
            case 'dhan':
                const dhanResponse = await callBrokerAPI(broker, '/orders', credentials);
                const dhanOrders = Array.isArray(dhanResponse) ? dhanResponse : (dhanResponse.data || []);
                orders = dhanOrders.filter(order => 
                    order.orderStatus === 'PENDING' || order.orderStatus === 'OPEN' || order.orderStatus === 'TRANSIT'
                );
                break;
            
            case 'zerodha':
                const zerodhaResponse = await callBrokerAPI(broker, '/orders', credentials);
                orders = (zerodhaResponse.data || []).filter(order => 
                    order.status === 'TRIGGER PENDING' || order.status === 'OPEN'
                );
                break;
            
            case 'upstox':
                const upstoxResponse = await callBrokerAPI(broker, '/order/retrieve-all', credentials);
                orders = (upstoxResponse.data || []).filter(order => 
                    order.status === 'pending' || order.status === 'open'
                );
                break;
            
            case 'angelone':
                const angelResponse = await callBrokerAPI(broker, '/rest/secure/angelbroking/order/v1/getOrderBook', credentials, 'GET');
                orders = (angelResponse.data || []).filter(order => 
                    order.status === 'pending' || order.status === 'open'
                );
                break;
            
            default:
                return res.status(400).json({ error: 'Unsupported broker' });
        }

        res.json({ 
            success: true, 
            broker,
            orders 
        });

    } catch (error) {
        console.error('Error fetching pending orders:', error);
        res.status(500).json({ 
            error: 'Failed to fetch pending orders', 
            message: error.message 
        });
    }
};

// Get order history
exports.getOrderHistory = async (req, res) => {
    try {
        const { broker, from_date, to_date } = req.query;
        
        console.log(`📋 getOrderHistory called - broker: ${broker}, userId: ${req.userId}`);
        console.log(`📅 Date range: ${from_date || 'not specified'} to ${to_date || 'not specified'}`);
        
        if (!broker) {
            return res.status(400).json({ error: 'Broker parameter is required' });
        }

        const credentials = await getUserBrokerCredentials(req.userId, broker);
        
        if (credentials.error) {
            console.error(`❌ Credentials error: ${credentials.error}`);
            return res.status(404).json({ error: credentials.error });
        }

        let orders = [];

        switch (broker) {
            case 'dhan':
                console.log('🌐 Calling Dhan orders API...');
                
                // Try multiple approaches for Dhan historical orders
                let dhanResponse;
                
                if (from_date && to_date) {
                    console.log(`📅 Attempting to fetch orders from ${from_date} to ${to_date}`);
                    
                    // Approach 1: Try with query parameters
                    try {
                        console.log('🔄 Attempt 1: Query parameters');
                        const endpoint1 = `/orders?from_date=${from_date}&to_date=${to_date}`;
                        dhanResponse = await callBrokerAPI(broker, endpoint1, credentials);
                        console.log('✅ Query parameters approach worked');
                    } catch (err1) {
                        console.log('❌ Query parameters failed:', err1.message);
                        
                        // Approach 2: Try POST with body
                        try {
                            console.log('🔄 Attempt 2: POST with body');
                            dhanResponse = await callBrokerAPI(broker, '/orders', credentials, 'POST', {
                                from_date: from_date,
                                to_date: to_date
                            });
                            console.log('✅ POST with body approach worked');
                        } catch (err2) {
                            console.log('❌ POST with body failed:', err2.message);
                            
                            // Approach 3: Try order-slips endpoint
                            try {
                                console.log('🔄 Attempt 3: Order slips endpoint');
                                dhanResponse = await callBrokerAPI(broker, `/order-slips?from_date=${from_date}&to_date=${to_date}`, credentials);
                                console.log('✅ Order slips endpoint worked');
                            } catch (err3) {
                                console.log('❌ Order slips failed:', err3.message);
                                
                                // Fallback: Get today's orders
                                console.log('⚠️ Falling back to today\'s orders only');
                                dhanResponse = await callBrokerAPI(broker, '/orders', credentials);
                            }
                        }
                    }
                } else {
                    console.log('📅 No date range specified - fetching today\'s orders');
                    dhanResponse = await callBrokerAPI(broker, '/orders', credentials);
                }
                
                console.log('📦 Dhan orders raw response type:', typeof dhanResponse);
                console.log('📦 Is array?', Array.isArray(dhanResponse));
                console.log(`📦 Dhan orders response: ${JSON.stringify(dhanResponse).substring(0, 500)}`);
                orders = Array.isArray(dhanResponse) ? dhanResponse : (dhanResponse.data || []);
                console.log(`✅ Orders processed: ${orders.length} items`);
                
                if (orders.length > 0) {
                    console.log('📋 First order sample:', JSON.stringify(orders[0], null, 2));
                    console.log('📊 Total orders found:', orders.length);
                } else {
                    console.log('ℹ️ No orders returned');
                    console.log('💡 Possible reasons:');
                    console.log('   - No orders placed in specified date range');
                    console.log('   - Dhan API may not support historical orders via this endpoint');
                    console.log('   - Access token may be for different account');
                    console.log('   - Try checking orders directly in Dhan app/website');
                }
                break;
            
            case 'zerodha':
                const zerodhaResponse = await callBrokerAPI(broker, '/orders', credentials);
                orders = zerodhaResponse.data || [];
                break;
            
            case 'upstox':
                const upstoxResponse = await callBrokerAPI(broker, '/order/retrieve-all', credentials);
                orders = upstoxResponse.data || [];
                break;
            
            case 'angelone':
                const angelResponse = await callBrokerAPI(broker, '/rest/secure/angelbroking/order/v1/getOrderBook', credentials, 'GET');
                orders = angelResponse.data || [];
                break;
            
            default:
                return res.status(400).json({ error: 'Unsupported broker' });
        }

        res.json({ 
            success: true, 
            broker,
            orders 
        });

    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ 
            error: 'Failed to fetch order history', 
            message: error.message 
        });
    }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
    try {
        const { broker } = req.query;
        const { orderId } = req.params;
        
        if (!broker) {
            return res.status(400).json({ error: 'Broker parameter is required' });
        }

        const credentials = await getUserBrokerCredentials(req.userId, broker);
        
        if (credentials.error) {
            return res.status(404).json({ error: credentials.error });
        }

        let orderDetails = {};

        switch (broker) {
            case 'dhan':
                const dhanResponse = await callBrokerAPI(broker, `/orders/${orderId}`, credentials);
                orderDetails = dhanResponse.data || {};
                break;
            
            case 'zerodha':
                const zerodhaResponse = await callBrokerAPI(broker, `/orders/${orderId}`, credentials);
                orderDetails = zerodhaResponse.data || {};
                break;
            
            case 'upstox':
                const upstoxResponse = await callBrokerAPI(broker, `/order/details?order_id=${orderId}`, credentials);
                orderDetails = upstoxResponse.data || {};
                break;
            
            case 'angelone':
                // Angel One doesn't have a specific order details endpoint, fetch from order book
                const angelResponse = await callBrokerAPI(broker, '/rest/secure/angelbroking/order/v1/getOrderBook', credentials, 'GET');
                const orders = angelResponse.data || [];
                orderDetails = orders.find(order => order.orderid === orderId) || {};
                break;
            
            default:
                return res.status(400).json({ error: 'Unsupported broker' });
        }

        res.json({ 
            success: true, 
            broker,
            orderDetails 
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ 
            error: 'Failed to fetch order details', 
            message: error.message 
        });
    }
};

// Get quote for a symbol
exports.getQuote = async (req, res) => {
    try {
        const { broker } = req.query;
        const { symbol } = req.params;
        
        if (!broker) {
            return res.status(400).json({ error: 'Broker parameter is required' });
        }

        const credentials = await getUserBrokerCredentials(req.userId, broker);
        
        if (credentials.error) {
            return res.status(404).json({ error: credentials.error });
        }

        let quote = {};

        switch (broker) {
            case 'dhan':
                const dhanResponse = await callBrokerAPI(broker, `/marketfeed/ltp`, credentials, 'POST', {
                    securities: [symbol]
                });
                quote = dhanResponse.data?.[0] || {};
                break;
            
            case 'zerodha':
                const zerodhaResponse = await callBrokerAPI(broker, `/quote?i=${symbol}`, credentials);
                quote = zerodhaResponse.data?.[symbol] || {};
                break;
            
            case 'upstox':
                const upstoxResponse = await callBrokerAPI(broker, `/market-quote/ltp?symbol=${symbol}`, credentials);
                quote = upstoxResponse.data || {};
                break;
            
            case 'angelone':
                const angelResponse = await callBrokerAPI(broker, '/rest/secure/angelbroking/market/v1/quote/', credentials, 'POST', {
                    mode: 'LTP',
                    exchangeTokens: { NSE: [symbol] }
                });
                quote = angelResponse.data || {};
                break;
            
            default:
                return res.status(400).json({ error: 'Unsupported broker' });
        }

        res.json({ 
            success: true, 
            broker,
            symbol,
            quote 
        });

    } catch (error) {
        console.error('Error fetching quote:', error);
        res.status(500).json({ 
            error: 'Failed to fetch quote', 
            message: error.message 
        });
    }
};

// Get multiple quotes
exports.getMultipleQuotes = async (req, res) => {
    try {
        const { broker, symbols } = req.body;
        
        console.log('📊 getMultipleQuotes called with:', { broker, symbols });
        
        if (!broker) {
            return res.status(400).json({ error: 'Broker parameter is required' });
        }

        if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({ error: 'Symbols array is required' });
        }

        if (symbols.length === 0) {
            return res.json({ success: true, broker, quotes: [] });
        }

        const credentials = await getUserBrokerCredentials(req.userId, broker);
        
        if (credentials.error) {
            return res.status(404).json({ error: credentials.error });
        }

        let quotes = [];

        switch (broker) {
            case 'dhan':
                // Dhan requires security IDs in format: {"NSE_EQ": ["1333", "11536"]}
                // For now, we'll convert symbol names to a format Dhan might accept
                // In production, you'd need a symbol-to-security-ID mapping
                
                // Try to parse symbols as security IDs if they contain ":"
                // Format: "NSE_EQ:1333" or just "1333" (defaults to NSE_EQ)
                const dhanSecurities = {};
                
                symbols.forEach(symbol => {
                    if (symbol.includes(':')) {
                        const [exchange, secId] = symbol.split(':');
                        if (!dhanSecurities[exchange]) {
                            dhanSecurities[exchange] = [];
                        }
                        dhanSecurities[exchange].push(secId);
                    } else {
                        // Default to NSE_EQ if no exchange specified
                        if (!dhanSecurities['NSE_EQ']) {
                            dhanSecurities['NSE_EQ'] = [];
                        }
                        dhanSecurities['NSE_EQ'].push(symbol);
                    }
                });
                
                console.log('Dhan market feed request:', JSON.stringify(dhanSecurities));
                
                const dhanResponse = await callBrokerAPI(broker, `/marketfeed/ltp`, credentials, 'POST', dhanSecurities);
                console.log('Dhan market feed response:', JSON.stringify(dhanResponse));
                
                // Transform Dhan response to standard format
                const dhanData = dhanResponse.data || dhanResponse;
                if (Array.isArray(dhanData)) {
                    quotes = dhanData.map(item => ({
                        symbol: item.trading_symbol || item.tradingSymbol || 'Unknown',
                        ltp: item.LTP || item.ltp || 0,
                        change: item.change || 0,
                        change_percent: item.change_percent || item.pChange || 0,
                        last_price: item.LTP || item.ltp || 0
                    }));
                }
                break;
            
            case 'zerodha':
                const symbolQuery = symbols.map(s => `i=${s}`).join('&');
                const zerodhaResponse = await callBrokerAPI(broker, `/quote?${symbolQuery}`, credentials);
                quotes = Object.values(zerodhaResponse.data || {});
                break;
            
            case 'upstox':
                const upstoxSymbols = symbols.join(',');
                const upstoxResponse = await callBrokerAPI(broker, `/market-quote/ltp?symbol=${upstoxSymbols}`, credentials);
                quotes = Object.values(upstoxResponse.data || {});
                break;
            
            case 'angelone':
                const angelResponse = await callBrokerAPI(broker, '/rest/secure/angelbroking/market/v1/quote/', credentials, 'POST', {
                    mode: 'LTP',
                    exchangeTokens: { NSE: symbols }
                });
                quotes = angelResponse.data || [];
                break;
            
            default:
                return res.status(400).json({ error: 'Unsupported broker' });
        }

        res.json({ 
            success: true, 
            broker,
            quotes 
        });

    } catch (error) {
        console.error('❌ Error fetching quotes:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        // If it's a Dhan API error, provide more details
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message;
        
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch quotes', 
            message: errorMessage,
            details: error.response?.data
        });
    }
};