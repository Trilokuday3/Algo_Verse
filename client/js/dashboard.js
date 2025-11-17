// API_BASE_URL is defined in api.js which is loaded before this file

document.addEventListener('DOMContentLoaded', async () => {
    // Update account icon with user's email initial
    await updateAccountIcon();

    // Check token expiry and show notification if needed
    checkTokenExpiry();

    // Get all the elements we need to update
    const netWorthEl = document.getElementById('net-worth');
    const pnlEl = document.getElementById('pnl');
    const pnlPercentEl = document.getElementById('pnl-percent');
    const activeStrategiesEl = document.getElementById('active-strategies');
    const statusTextEl = document.getElementById('broker-status-text');
    const statusIconEl = document.getElementById('broker-status-icon');
    const positionsTableBody = document.getElementById('positions-tbody');
    const holdingsTableBody = document.getElementById('holdings-tbody');
    const ordersTableBody = document.getElementById('orders-tbody');

    // Market data tracking
    let watchedSymbols = JSON.parse(localStorage.getItem('watchedSymbols') || '[]');
    let marketDataInterval = null;
    
    // Initialize date range for orders (default: last 30 days)
    function initializeOrderDateRange() {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };
        
        const fromDateInput = document.getElementById('order-from-date');
        const toDateInput = document.getElementById('order-to-date');
        
        if (fromDateInput) fromDateInput.value = formatDate(thirtyDaysAgo);
        if (toDateInput) toDateInput.value = formatDate(today);
        
        console.log('📅 Order date range initialized: ', formatDate(thirtyDaysAgo), 'to', formatDate(today));
    }
    
    initializeOrderDateRange();
    
    // HARDCODED TO DHAN ONLY - No broker selection needed
    const selectedBroker = 'dhan';
    console.log('🎯 Dashboard configured for DHAN broker only');

    // --- Function to format numbers as currency ---
    function formatCurrency(value) {
        if (typeof value !== 'number') return 'N/A';
        return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // --- Load Holdings ---
    async function loadHoldings() {
        try {
            console.log('📊 Loading holdings from Dhan...');
            const response = await fetch(`${API_BASE_URL}/api/broker/portfolio/holdings?broker=dhan`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            console.log('📡 Holdings response status:', response.status);
            const data = await response.json();
            console.log('📦 Holdings data:', data);

            if (data.error) {
                console.error('❌ Holdings error:', data.error);
                console.error('Error message:', data.message);
                console.error('Error details:', data.details);
                holdingsTableBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-600">${data.error}<br><small>${data.message || ''}</small></td></tr>`;
                return;
            }

            const holdings = data.holdings || [];
            console.log(`📊 Holdings count: ${holdings.length}`);
            
            // Log first holding to see structure
            if (holdings.length > 0) {
                console.log('📋 First holding structure:', holdings[0]);
                console.log('Available fields:', Object.keys(holdings[0]));
            }
            
            if (holdings.length === 0) {
                holdingsTableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center">No holdings found. (This is normal if you have no holdings in your Dhan account)</td></tr>';
                return;
            }

            holdingsTableBody.innerHTML = holdings.map((holding, index) => {
                // Log each holding for debugging
                if (index < 3) {
                    console.log(`Holding ${index + 1}:`, holding);
                }
                
                // Try multiple possible field names for Dhan
                const symbol = holding.tradingsymbol || holding.symbol || holding.securityId || holding.isin || 'N/A';
                const quantity = holding.quantity || holding.qty || holding.totalQty || 0;
                const avgPrice = holding.average_price || holding.avgPrice || holding.costPrice || holding.buyAvg || 0;
                const currentValue = holding.current_value || holding.value || holding.marketValue || holding.currentValue || 0;
                
                return `
                    <tr>
                        <td class="py-2 px-4 font-semibold">${symbol}</td>
                        <td class="py-2 px-4 text-right">${quantity}</td>
                        <td class="py-2 px-4 text-right">${formatCurrency(avgPrice)}</td>
                        <td class="py-2 px-4 text-right">${formatCurrency(currentValue)}</td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('❌ Error loading holdings:', error);
            holdingsTableBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-600">Failed to load holdings.<br><small>${error.message}</small></td></tr>`;
        }
    }

    // --- Load Orders ---
    async function loadOrders(filter = 'all', fromDate = null, toDate = null) {
        try {
            console.log('📋 Loading orders from Dhan...');
            console.log('Filter:', filter, 'From:', fromDate, 'To:', toDate);
            
            let endpoint = filter === 'pending' 
                ? `${API_BASE_URL}/api/broker/orders/pending?broker=dhan`
                : `${API_BASE_URL}/api/broker/orders/history?broker=dhan`;
            
            // Add date range parameters if provided
            if (fromDate) {
                endpoint += `&from_date=${fromDate}`;
            }
            if (toDate) {
                endpoint += `&to_date=${toDate}`;
            }

            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();

            if (data.error) {
                ordersTableBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-600">${data.error}</td></tr>`;
                return;
            }

            let orders = data.orders || [];
            
            console.log(`📊 Total orders received: ${orders.length}`);
            if (orders.length > 0) {
                console.log('First order sample:', orders[0]);
            }

            // Apply filter if needed
            if (filter === 'executed') {
                orders = orders.filter(order => {
                    const status = (order.status || order.orderStatus || '').toLowerCase();
                    // Dhan uses: TRADED, REJECTED, CANCELLED, PENDING, TRANSIT
                    return status.includes('complete') || 
                           status.includes('executed') || 
                           status.includes('traded') ||
                           status.includes('filled');
                });
                console.log(`📊 After 'executed' filter: ${orders.length} orders`);
            }

            if (orders.length === 0) {
                ordersTableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center">No orders found.</td></tr>';
                return;
            }

            ordersTableBody.innerHTML = orders.map(order => {
                const status = order.status || order.orderStatus || 'Unknown';
                const statusLower = status.toLowerCase();
                
                // Determine status color based on Dhan status values
                let statusClass = 'text-gray-600';
                if (statusLower.includes('complete') || statusLower.includes('executed') || 
                    statusLower.includes('traded') || statusLower.includes('filled')) {
                    statusClass = 'text-green-600';
                } else if (statusLower.includes('pending') || statusLower.includes('open') || 
                           statusLower.includes('transit')) {
                    statusClass = 'text-yellow-600';
                } else if (statusLower.includes('reject') || statusLower.includes('cancel')) {
                    statusClass = 'text-red-600';
                }

                return `
                    <tr>
                        <td class="py-2 px-4 font-semibold">${order.tradingsymbol || order.symbol || order.securityId || 'N/A'}</td>
                        <td class="py-2 px-4 text-right">${order.transaction_type || order.transactionType || order.orderType || order.ordertype || 'N/A'}</td>
                        <td class="py-2 px-4 text-right">${order.quantity || order.qty || 0}</td>
                        <td class="py-2 px-4 text-right ${statusClass}">${status}</td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading orders:', error);
            ordersTableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-red-600">Failed to load orders.</td></tr>';
        }
    }

    // --- Load Positions ---
    async function loadPositions() {
        console.log('📊 Loading positions from Dhan...');
        
        try {
            const url = `${API_BASE_URL}/api/broker/portfolio/positions?broker=dhan`;
            console.log('🌐 Fetching from:', url);
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            console.log('📡 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response data:', data);

            if (data.error) {
                console.error('❌ Error from API:', data.error);
                positionsTableBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-red-600">${data.error}</td></tr>`;
                return;
            }

            const positions = data.positions || [];
            console.log('✅ Positions loaded:', positions.length);
            
            if (positions.length === 0) {
                positionsTableBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center" style="color: var(--on-surface-variant-color);">No open positions.</td></tr>';
                return;
            }

            positionsTableBody.innerHTML = positions.map(pos => {
                const pnl = pos.pnl || pos.unrealised || 0;
                const pnlClass = pnl >= 0 ? 'text-green-600' : 'text-red-600';
                const percentChange = pos.day_change_percentage || pos.dayChangePercentage || 0;

                return `
                    <tr>
                        <td class="py-2 px-4 font-semibold">${pos.tradingsymbol || pos.symbol || 'N/A'}</td>
                        <td class="py-2 px-4 text-right">${pos.quantity || pos.netQuantity || 0}</td>
                        <td class="py-2 px-4 text-right">${formatCurrency(pos.ltp || pos.last_price || 0)}</td>
                        <td class="py-2 px-4 text-right font-semibold ${pnlClass}">${formatCurrency(pnl)}</td>
                        <td class="py-2 px-4 text-right ${pnlClass}">${percentChange.toFixed(2)}%</td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('❌ Error loading positions:', error);
            positionsTableBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-red-600">Failed to load positions.</td></tr>';
        }
    }

    // --- Load Funds ---
    async function loadFunds() {
        try {
            console.log('💰 Loading funds from Dhan...');
            const response = await fetch(`${API_BASE_URL}/api/broker/portfolio/funds?broker=dhan`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();

            if (data.error) {
                netWorthEl.textContent = 'N/A';
                pnlEl.textContent = 'N/A';
                pnlPercentEl.textContent = 'N/A';
                return;
            }

            const funds = data.funds || {};
            const netWorth = funds.net || funds.equity?.net || funds.available_balance || 0;
            const dayPnl = funds.day_pnl || funds.equity?.day_pnl || funds.pnl || 0;
            
            netWorthEl.textContent = formatCurrency(netWorth);
            pnlEl.textContent = formatCurrency(dayPnl);
            
            const pnlPercent = netWorth > 0 ? ((dayPnl / netWorth) * 100).toFixed(2) : 0;
            pnlPercentEl.textContent = `${dayPnl >= 0 ? '+' : ''}${pnlPercent}%`;
            
            if (dayPnl < 0) {
                pnlEl.classList.remove('text-green-600');
                pnlEl.classList.add('text-red-600');
                pnlPercentEl.classList.remove('text-green-600');
                pnlPercentEl.classList.add('text-red-600');
            } else {
                pnlEl.classList.remove('text-red-600');
                pnlEl.classList.add('text-green-600');
                pnlPercentEl.classList.remove('text-red-600');
                pnlPercentEl.classList.add('text-green-600');
            }
        } catch (error) {
            console.error('Error loading funds:', error);
        }
    }

    // --- Market Data Functions ---
    async function loadMarketData() {
        if (watchedSymbols.length === 0) return;

        try {
            console.log('📈 Loading market data from Dhan for symbols:', watchedSymbols);
            const response = await fetch(`${API_BASE_URL}/api/broker/market/quotes`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ broker: 'dhan', symbols: watchedSymbols })
            });
            
            console.log('📡 Market data response status:', response.status);
            const data = await response.json();
            console.log('📦 Market data response:', data);

            if (data.error) {
                console.error('❌ Market data error:', data.error);
                console.error('Error details:', data);
                const container = document.getElementById('market-data-container');
                
                let errorHtml = `<div class="text-center py-8 text-red-600">
                    <p class="m3-title-medium font-semibold mb-2">${data.error}</p>`;
                
                if (data.message) {
                    errorHtml += `<p class="m3-body-medium mb-2">${data.message}</p>`;
                }
                
                if (data.details) {
                    errorHtml += `<p class="m3-body-small" style="color: var(--on-surface-variant-color);">
                        Details: ${JSON.stringify(data.details)}
                    </p>`;
                }
                
                errorHtml += `<p class="m3-body-small mt-4" style="color: var(--on-surface-variant-color);">
                    Note: For Dhan, use Security IDs (e.g., "1333" for RELIANCE)
                </p></div>`;
                
                container.innerHTML = errorHtml;
                return;
            }

            updateMarketDataUI(data.quotes || []);
        } catch (error) {
            console.error('❌ Error loading market data:', error);
            const container = document.getElementById('market-data-container');
            container.innerHTML = '<div class="text-center py-8 text-red-600"><p class="m3-body-large">Failed to load market data</p></div>';
        }
    }

    function updateMarketDataUI(quotes) {
        const container = document.getElementById('market-data-container');
        
        // Handle invalid quotes data
        if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
            container.innerHTML = '<div class="text-center py-8" style="color: var(--on-surface-variant-color);"><p class="m3-body-large">Add symbols to track market data</p></div>';
            return;
        }

        container.innerHTML = quotes.map((quote, index) => {
            const symbol = watchedSymbols[index];
            const price = quote.ltp || quote.last_price || quote.close || 0;
            const change = quote.change || 0;
            const changePercent = quote.change_percent || quote.pChange || 0;
            const changeClass = change >= 0 ? 'text-green-600' : 'text-red-600';

            return `
                <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-500/10 transition-colors">
                    <div class="flex-1">
                        <h4 class="m3-label-large font-semibold">${symbol}</h4>
                        <p class="m3-body-small ${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)</p>
                    </div>
                    <div class="text-right">
                        <p class="m3-title-medium font-bold">${formatCurrency(price)}</p>
                    </div>
                    <button onclick="removeSymbol('${symbol}')" class="ml-3 text-red-600 hover:bg-red-100 p-2 rounded-full" aria-label="Remove ${symbol}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
    }

    // Make removeSymbol function global
    window.removeSymbol = function(symbol) {
        watchedSymbols = watchedSymbols.filter(s => s !== symbol);
        localStorage.setItem('watchedSymbols', JSON.stringify(watchedSymbols));
        loadMarketData();
    };

    // --- Symbol Modal Functions ---
    const symbolModal = document.getElementById('symbol-modal');
    const addSymbolBtn = document.getElementById('add-symbol');
    const cancelSymbolBtn = document.getElementById('cancel-symbol');
    const confirmSymbolBtn = document.getElementById('confirm-symbol');
    const symbolInput = document.getElementById('symbol-input');

    addSymbolBtn.addEventListener('click', () => {
        symbolModal.classList.remove('hidden');
        symbolModal.classList.add('flex');
        symbolInput.value = '';
        symbolInput.focus();
    });

    cancelSymbolBtn.addEventListener('click', () => {
        symbolModal.classList.add('hidden');
        symbolModal.classList.remove('flex');
    });

    confirmSymbolBtn.addEventListener('click', () => {
        const symbol = symbolInput.value.trim().toUpperCase();
        if (symbol && !watchedSymbols.includes(symbol)) {
            watchedSymbols.push(symbol);
            localStorage.setItem('watchedSymbols', JSON.stringify(watchedSymbols));
            loadMarketData();
        }
        symbolModal.classList.add('hidden');
        symbolModal.classList.remove('flex');
    });

    symbolInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmSymbolBtn.click();
        }
    });

    // --- Backtesting Functions ---
    const backtestForm = document.getElementById('backtest-form');
    const backtestStrategySelect = document.getElementById('backtest-strategy');
    const backtestResults = document.getElementById('backtest-results');

    // Load strategies into backtest dropdown
    async function loadStrategiesForBacktest() {
        try {
            const strategies = await getAllStrategies();
            backtestStrategySelect.innerHTML = '<option value="">Select a strategy</option>' +
                strategies.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading strategies:', error);
        }
    }

    backtestForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const strategyId = backtestStrategySelect.value;
        const symbol = document.getElementById('backtest-symbol').value.trim().toUpperCase();
        const startDate = document.getElementById('backtest-start-date').value;
        const endDate = document.getElementById('backtest-end-date').value;
        const initialCapital = parseFloat(document.getElementById('backtest-capital').value);

        if (!strategyId || !symbol || !startDate || !endDate) {
            alert('Please fill in all fields');
            return;
        }

        try {
            // Get strategy code
            const strategy = await getStrategyById(strategyId);
            if (!strategy) {
                alert('Strategy not found');
                return;
            }

            // Show loading state
            const runBtn = document.getElementById('run-backtest-btn');
            runBtn.disabled = true;
            runBtn.textContent = 'Running...';

            // Run backtest
            const response = await fetch(`${API_BASE_URL}/api/backtest/run`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    strategyCode: strategy.code,
                    startDate,
                    endDate,
                    initialCapital,
                    symbol,
                    broker: 'dhan'
                })
            });

            const data = await response.json();

            if (data.error) {
                alert('Backtest failed: ' + data.error);
            } else {
                // Show results
                const results = data.results;
                document.getElementById('result-trades').textContent = results.totalTrades;
                document.getElementById('result-winrate').textContent = results.winRate.toFixed(2) + '%';
                document.getElementById('result-pnl').textContent = formatCurrency(results.totalPnL);
                document.getElementById('result-capital').textContent = formatCurrency(results.finalCapital);

                backtestResults.classList.remove('hidden');
            }

            runBtn.disabled = false;
            runBtn.textContent = 'Run Backtest';
        } catch (error) {
            console.error('Error running backtest:', error);
            alert('Failed to run backtest');
            const runBtn = document.getElementById('run-backtest-btn');
            runBtn.disabled = false;
            runBtn.textContent = 'Run Backtest';
        }
    });

    // --- Event Listeners ---
    document.getElementById('refresh-holdings')?.addEventListener('click', loadHoldings);
    document.getElementById('refresh-orders')?.addEventListener('click', () => {
        const filter = document.getElementById('order-filter').value;
        const fromDate = document.getElementById('order-from-date').value;
        const toDate = document.getElementById('order-to-date').value;
        loadOrders(filter, fromDate, toDate);
    });
    document.getElementById('refresh-positions')?.addEventListener('click', loadPositions);
    
    // Apply order filters button
    document.getElementById('apply-order-filters')?.addEventListener('click', () => {
        const filter = document.getElementById('order-filter').value;
        const fromDate = document.getElementById('order-from-date').value;
        const toDate = document.getElementById('order-to-date').value;
        loadOrders(filter, fromDate, toDate);
    });
    
    // Legacy filter dropdown (kept for backward compatibility)
    document.getElementById('order-filter')?.addEventListener('change', (e) => {
        const fromDate = document.getElementById('order-from-date').value;
        const toDate = document.getElementById('order-to-date').value;
        loadOrders(e.target.value, fromDate, toDate);
    });

    // --- Load Active Strategies Count ---
    async function loadActiveStrategies() {
        try {
            const strategies = await getAllStrategies();
            const activeCount = strategies.filter(s => s.status === 'running').length;
            activeStrategiesEl.textContent = activeCount;
        } catch (error) {
            console.error('Error loading active strategies:', error);
            activeStrategiesEl.textContent = '0';
        }
    }

    // --- Initial Data Load ---
    try {
        console.log('🚀 Initializing dashboard with Dhan broker...');
        
        // Set broker status to connected (since we're hardcoded to Dhan)
        statusTextEl.textContent = 'Connected to Dhan';
        statusIconEl.classList.remove('bg-gray-500', 'bg-red-500', 'bg-yellow-500', 'animate-pulse');
        statusIconEl.classList.add('bg-green-500');

        // Load all data
        const initialFromDate = document.getElementById('order-from-date').value;
        const initialToDate = document.getElementById('order-to-date').value;
        
        await Promise.all([
            loadFunds(),
            loadHoldings(),
            loadPositions(),
            loadOrders('all', initialFromDate, initialToDate),
            loadActiveStrategies(),
            loadStrategiesForBacktest(),
            loadMarketData()
        ]);

        // Start market data refresh (every 5 seconds)
        marketDataInterval = setInterval(loadMarketData, 5000);
        
        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error("❌ Dashboard initialization error:", error);
        statusTextEl.textContent = 'Error';
        statusIconEl.classList.remove('bg-green-500', 'bg-yellow-500', 'animate-pulse');
        statusIconEl.classList.add('bg-red-500');
        
        netWorthEl.textContent = 'N/A';
        pnlEl.textContent = 'N/A';
        pnlPercentEl.textContent = 'N/A';
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (marketDataInterval) {
            clearInterval(marketDataInterval);
        }
    });
});

// Function to update account icon with user's email initial
async function updateAccountIcon() {
    try {
        const profile = await getUserProfile();
        if (profile && profile.email) {
            const email = profile.email;
            const avatarLetter = email.charAt(0).toUpperCase();
            
            // Update the button icon
            const accountIcon = document.getElementById('account-icon');
            if (accountIcon) {
                accountIcon.textContent = avatarLetter;
            }
            
            // Update dropdown email
            const dropdownEmail = document.getElementById('dropdown-email');
            if (dropdownEmail) {
                dropdownEmail.textContent = email;
            }
            
            // Update dropdown avatar text
            const dropdownAvatarText = document.getElementById('dropdown-avatar-text');
            if (dropdownAvatarText) {
                dropdownAvatarText.textContent = avatarLetter;
            }
        }
    } catch (error) {
        console.error('Error updating account icon:', error);
    }
}

// =================================================================
// --- Token Expiry Notification System ---
// =================================================================

function checkTokenExpiry() {
    // Check if notification was already shown in this session
    const notificationShown = sessionStorage.getItem('tokenNotificationShown');
    
    if (!notificationShown) {
        // Show notification only once per login session
        setTimeout(() => {
            showTokenExpiryNotification();
            // Mark as shown for this session
            sessionStorage.setItem('tokenNotificationShown', 'true');
        }, 2000); // Show after 2 seconds to let dashboard load
    }
}

function showTokenExpiryNotification() {
    const banner = document.getElementById('token-expiry-banner');
    if (banner) {
        banner.style.display = 'block';
        
        // Update last token update time
        updateLastTokenUpdateDisplay();
    }
}

function hideTokenExpiryNotification() {
    const banner = document.getElementById('token-expiry-banner');
    if (banner) {
        banner.style.display = 'none';
    }
}

function updateLastTokenUpdateDisplay() {
    // Try to get the last token update from credentials
    fetch(`${API_BASE_URL}/api/user/broker-credentials`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const lastUpdateEl = document.getElementById('last-token-update-banner');
        if (data && data.credentials && data.credentials.length > 0) {
            const dhanCred = data.credentials.find(cred => cred.broker === 'dhan');
            if (dhanCred && dhanCred.updatedAt) {
                const updateDate = new Date(dhanCred.updatedAt);
                const now = new Date();
                const hoursDiff = Math.floor((now - updateDate) / (1000 * 60 * 60));
                
                if (hoursDiff < 24) {
                    lastUpdateEl.textContent = `${hoursDiff} hour(s) ago`;
                    lastUpdateEl.parentElement.classList.remove('text-red-600');
                    lastUpdateEl.parentElement.classList.add('text-blue-900');
                } else {
                    const daysDiff = Math.floor(hoursDiff / 24);
                    lastUpdateEl.textContent = `${daysDiff} day(s) ago (Expired!)`;
                    lastUpdateEl.parentElement.classList.remove('text-blue-900');
                    lastUpdateEl.parentElement.classList.add('text-red-600');
                }
            } else {
                lastUpdateEl.textContent = 'Never';
            }
        } else {
            lastUpdateEl.textContent = 'Never';
        }
    })
    .catch(error => {
        console.error('Error fetching token status:', error);
        const lastUpdateEl = document.getElementById('last-token-update-banner');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = 'Unknown';
        }
    });
}

// Set up banner event listeners
document.getElementById('close-token-banner')?.addEventListener('click', hideTokenExpiryNotification);

document.getElementById('update-token-banner-btn')?.addEventListener('click', () => {
    // Redirect to profile page broker section
    window.location.href = 'profile.html#broker-section';
});

