document.addEventListener('DOMContentLoaded', async () => {
    // Update account icon with user's email initial
    await updateAccountIcon();

    const historyContainer = document.getElementById('history-container');
    const loadingDiv = document.getElementById('loading');
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const strategyFilter = document.getElementById('strategy-filter');
    const brokerFilter = document.getElementById('broker-filter');
    const statusFilter = document.getElementById('status-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');
    
    // Modal elements
    const outputModal = document.getElementById('output-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalStrategyName = document.getElementById('modal-strategy-name');
    const modalRunInfo = document.getElementById('modal-run-info');
    const modalOutput = document.getElementById('modal-output');

    let allHistory = [];
    let filteredHistory = [];
    let displayedCount = 0;
    const itemsPerPage = 20;

    // Fetch run history
    async function fetchHistory() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/strategy/history/all?limit=200', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`Failed to fetch history: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API Response:', data);
            
            allHistory = data.runs || [];
            filteredHistory = [...allHistory];
            
            console.log('Total history items:', allHistory.length);
            
            // Populate strategy filter
            const strategies = [...new Set(allHistory.map(h => h.strategyName))];
            strategyFilter.innerHTML = '<option value="">All Strategies</option>';
            strategies.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                strategyFilter.appendChild(option);
            });
            
            displayHistory();
        } catch (error) {
            console.error('Error fetching history:', error);
            loadingDiv.innerHTML = `
                <div class="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4" style="color: var(--error-color);">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p class="m3-body-large" style="color: var(--error-color);">Failed to load history</p>
                    <p class="m3-body-medium mt-2" style="color: var(--on-surface-variant-color);">${error.message}</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 rounded-lg" style="background-color: var(--primary-color); color: var(--on-primary-color);">Retry</button>
                </div>
            `;
        }
    }

    // Display history
    function displayHistory() {
        loadingDiv.style.display = 'none';
        
        if (filteredHistory.length === 0) {
            historyContainer.innerHTML = `
                <div class="m3-card p-12 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4" style="color: var(--on-surface-variant-color); opacity: 0.5;">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <h3 class="m3-title-large mb-2">No run history found</h3>
                    <p class="m3-body-large" style="color: var(--on-surface-variant-color);">Run a strategy to see execution logs here</p>
                    <a href="terminal.html" class="inline-block mt-6 px-6 py-3 rounded-lg transition-all" style="background-color: var(--primary-color); color: var(--on-primary-color);">Go to Terminal</a>
                </div>
            `;
            loadMoreContainer.classList.add('hidden');
            return;
        }

        const itemsToShow = filteredHistory.slice(0, displayedCount + itemsPerPage);
        displayedCount = itemsToShow.length;

        historyContainer.innerHTML = '';
        itemsToShow.forEach(run => {
            const card = createHistoryCard(run);
            historyContainer.appendChild(card);
        });

        // Show/hide load more button
        if (displayedCount < filteredHistory.length) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }

    // Create history card
    function createHistoryCard(run) {
        const card = document.createElement('div');
        card.className = 'm3-card p-6 mb-4 cursor-pointer hover:shadow-lg transition-all';
        
        const runDate = new Date(run.createdAt);
        const formattedDate = runDate.toLocaleString();
        const executionTime = run.executionTime ? `${(run.executionTime / 1000).toFixed(2)}s` : 'N/A';
        
        const statusColor = run.status === 'success' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)';
        const statusText = run.status === 'success' ? 'Success' : 'Error';
        const brokerName = {
            'dhan': 'Dhan',
            'zerodha': 'Zerodha',
            'upstox': 'Upstox',
            'angelone': 'Angel One'
        }[run.broker] || run.broker;

        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                        <h3 class="m3-title-large font-semibold">${run.strategyName}</h3>
                        <span class="px-3 py-1 rounded-full text-xs font-semibold" style="background-color: ${statusColor}; color: white;">${statusText}</span>
                    </div>
                    <div class="flex items-center space-x-4 text-sm" style="color: var(--on-surface-variant-color);">
                        <div class="flex items-center space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${executionTime}</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span>${brokerName}</span>
                        </div>
                    </div>
                    ${run.errorMessage ? `<p class="mt-2 text-sm" style="color: var(--md-sys-color-error);">Error: ${run.errorMessage}</p>` : ''}
                </div>
                <button class="ml-4 px-4 py-2 rounded-lg transition-all hover:bg-gray-500/10" style="border: 1px solid var(--outline-color);">
                    View Output
                </button>
            </div>
        `;

        card.addEventListener('click', () => showOutput(run));
        return card;
    }

    // Show output modal
    function showOutput(run) {
        const runDate = new Date(run.createdAt);
        const formattedDate = runDate.toLocaleString();
        const executionTime = run.executionTime ? `${(run.executionTime / 1000).toFixed(2)}s` : 'N/A';
        const brokerName = {
            'dhan': 'Dhan',
            'zerodha': 'Zerodha',
            'upstox': 'Upstox',
            'angelone': 'Angel One'
        }[run.broker] || run.broker;

        modalStrategyName.textContent = run.strategyName;
        modalRunInfo.textContent = `${formattedDate} • ${brokerName} • Execution Time: ${executionTime} • Status: ${run.status}`;
        modalOutput.textContent = run.terminalOutput || 'No output available';
        
        outputModal.style.display = 'flex';
    }

    // Close modal
    closeModalBtn.addEventListener('click', () => {
        outputModal.style.display = 'none';
    });

    outputModal.addEventListener('click', (e) => {
        if (e.target === outputModal) {
            outputModal.style.display = 'none';
        }
    });

    // Filter functions
    function applyFilters() {
        const strategyValue = strategyFilter.value;
        const brokerValue = brokerFilter.value;
        const statusValue = statusFilter.value;

        filteredHistory = allHistory.filter(run => {
            if (strategyValue && run.strategyName !== strategyValue) return false;
            if (brokerValue && run.broker !== brokerValue) return false;
            if (statusValue && run.status !== statusValue) return false;
            return true;
        });

        displayedCount = 0;
        displayHistory();
    }

    strategyFilter.addEventListener('change', applyFilters);
    brokerFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);

    clearFiltersBtn.addEventListener('click', () => {
        strategyFilter.value = '';
        brokerFilter.value = '';
        statusFilter.value = '';
        applyFilters();
    });

    // Load more
    loadMoreBtn.addEventListener('click', displayHistory);

    // Initial load
    await fetchHistory();
});

// =================================================================
// --- Account Dropdown & Icon Functions ---
// =================================================================

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

// Account dropdown toggle
document.addEventListener('click', function(event) {
    const accountButton = document.getElementById('account-button');
    const accountDropdown = document.getElementById('account-dropdown');
    
    if (accountButton && accountButton.contains(event.target)) {
        accountDropdown.classList.toggle('hidden');
    } else if (accountDropdown && !accountDropdown.contains(event.target)) {
        accountDropdown.classList.add('hidden');
    }
});

// Logout functionality
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('token');
        sessionStorage.clear();
        window.location.href = 'login.html';
    });
}
