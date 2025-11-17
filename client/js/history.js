// API_BASE_URL is defined in api.js which is loaded before this file

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
    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const logRows = document.getElementById('log-rows');
    const copyLogBtn = document.getElementById('copy-log-btn');
    const downloadLogBtn = document.getElementById('download-log-btn');
    const collapseLogBtn = document.getElementById('collapse-log-btn');
    const modalSearchInput = document.getElementById('modal-log-search');
    const modalAutoScrollBtn = document.getElementById('modal-auto-scroll');

    let allHistory = [];
    let filteredHistory = [];
    let displayedCount = 0;
    const itemsPerPage = 20;
    let currentLines = [];

    // Helpers
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>"'`]/g, function (match) {
            return ({
                '&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;', '`': '&#96;'
            })[match];
        });
    }

    function sanitizeFileName(name) {
        return (name || 'run').replace(/[^a-z0-9-_\.]/gi, '_');
    }

    // Format durations (ms) into human-readable strings
    function formatDuration(ms) {
        if (ms === null || ms === undefined || isNaN(ms)) return 'N/A';
        const totalSeconds = Math.floor(Number(ms) / 1000);
        if (totalSeconds < 60) {
            // show seconds with two decimals for shorter runs
            return `${(Number(ms) / 1000).toFixed(2)}s`;
        }
        if (totalSeconds < 3600) {
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return `${mins}m ${secs}s`;
        }
        const hours = Math.floor(totalSeconds / 3600);
        const rem = totalSeconds % 3600;
        const mins = Math.floor(rem / 60);
        const secs = rem % 60;
        return `${hours}h ${mins}m ${secs}s`;
    }

    // Fetch run history
    async function fetchHistory() {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.error('❌ No auth token found');
                throw new Error('Not logged in. Please log in first.');
            }
            
            console.log('📡 Fetching history from:', `${API_BASE_URL}/api/strategy/history/all`);
            
            const response = await fetch(`${API_BASE_URL}/api/strategy/history/all?limit=200`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                
                // If unauthorized, redirect to login
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                
                throw new Error(`Failed to fetch history: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ API Response:', data);
            
            allHistory = data.runs || [];
            filteredHistory = [...allHistory];
            
            console.log('📊 Total history items:', allHistory.length);
            
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
        
        const startDate = run.createdAt ? new Date(run.createdAt) : null;
        const startStr = startDate ? startDate.toLocaleString() : 'Unknown';
        const stopDate = run.stopTime ? new Date(run.stopTime) : null;
        const stopStr = stopDate ? stopDate.toLocaleString() : (run.status === 'running' ? 'Running' : 'N/A');
    const executionTime = formatDuration(run.executionTime);

        // Status badge mapping
        let statusColor = 'var(--md-sys-color-primary)';
        let statusText = 'Success';
        let statusTextColor = 'white';
        if (run.status === 'error') {
            statusColor = 'var(--md-sys-color-error)';
            statusText = 'Error';
            statusTextColor = 'white';
        } else if (run.status === 'running') {
            statusColor = 'var(--primary-color)';
            statusText = 'Running';
            statusTextColor = 'white';
        } else if (run.status === 'stopped') {
            statusColor = '#D9C6FF'; // Light purple matching Alpha background
            statusText = 'Stopped';
            statusTextColor = '#7c3aed';
        }
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
                        <span class="px-3 py-1 rounded-full text-xs font-semibold" style="background-color: ${statusColor}; color: ${statusTextColor};">${statusText}</span>
                    </div>
                    <div class="flex items-center space-x-4 text-sm" style="color: var(--on-surface-variant-color);">
                        <div class="flex items-center space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>Start: ${startStr}</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>Stop: ${stopStr}</span>
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
                <div class="ml-4 flex items-center space-x-2">
                    <button class="view-output-btn px-4 py-2 rounded-lg transition-all hover:bg-gray-500/10" style="border: 1px solid var(--outline-color);">
                        View Output
                    </button>
                    <button class="delete-run-btn w-10 h-10 rounded-lg transition-all hover:bg-red-500/10 flex items-center justify-center" style="border: 1px solid var(--md-sys-color-error); color: var(--md-sys-color-error);" title="Delete this run">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const viewOutputBtn = card.querySelector('.view-output-btn');
        const deleteRunBtn = card.querySelector('.delete-run-btn');
        
        viewOutputBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showOutput(run);
        });
        
        deleteRunBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete this run?\n\nStrategy: ${run.strategyName}\nStart: ${startStr}`)) {
                await deleteRun(run._id);
            }
        });
        
        return card;
    }

    // Show output modal
    function showOutput(run) {
        const startDate = run.createdAt ? new Date(run.createdAt) : null;
        const startStr = startDate ? startDate.toLocaleString() : 'Unknown';
        const stopDate = run.stopTime ? new Date(run.stopTime) : null;
        const stopStr = stopDate ? stopDate.toLocaleString() : (run.status === 'running' ? 'Running' : 'N/A');
    const executionTime = formatDuration(run.executionTime);
        const brokerName = {
            'dhan': 'Dhan',
            'zerodha': 'Zerodha',
            'upstox': 'Upstox',
            'angelone': 'Angel One'
        }[run.broker] || run.broker;

        modalTitle.textContent = run.strategyName;
        modalSubtitle.textContent = `Start: ${startStr} • Stop: ${stopStr} • Execution Time: ${executionTime} • Status: ${run.status}`;
        const logText = run.terminalOutput || 'No output available';

        // Render with line numbers
        const lines = logText.split(/\r?\n/);
        currentLines = lines;
        // Render rows: each row contains the number and the content so wrapped lines keep numbers aligned
        if (logRows) {
            logRows.innerHTML = lines.map((l, idx) => `\n                <div class="log-row">\n                    <span class="log-line-number">${idx+1}</span>\n                    <span class="log-line">${escapeHtml(l)}</span>\n                </div>`).join('\n');
            // ensure scroll area will be handled by container
        }

        // Update footer counts (Info / Warning / Error) and total
        (function updateFooterCounts() {
            try {
                let info = 0, warn = 0, err = 0;
                lines.forEach(l => {
                    const up = (l || '').toUpperCase();
                    if (up.includes('ERROR')) err++;
                    else if (up.includes('WARN')) warn++;
                    else if (up.includes('INFO')) info++;
                });
                const infoEl = document.getElementById('footer-info-count');
                const warnEl = document.getElementById('footer-warn-count');
                const errEl = document.getElementById('footer-error-count');
                const totalEl = document.getElementById('footer-total');
                if (infoEl) infoEl.textContent = `${info} Info`;
                if (warnEl) warnEl.textContent = `${warn} Warning`;
                if (errEl) errEl.textContent = `${err} Error`;
                if (totalEl) totalEl.textContent = `Total: ${lines.length} logs`;
            } catch (e) {
                console.error('Footer count update failed', e);
            }
        })();

    // Footer removed (no Info/Warning/Error counters) — intentionally omitted to match strategy log viewer

        // Setup action buttons
        if (copyLogBtn) {
            // label to match screenshot
            copyLogBtn.textContent = 'Copy All';
            copyLogBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(logText);
                    copyLogBtn.textContent = 'Copied';
                    setTimeout(() => copyLogBtn.textContent = 'Copy All', 1200);
                } catch (err) {
                    console.error('Copy failed', err);
                }
            };
        }
        if (downloadLogBtn) {
            downloadLogBtn.onclick = () => {
                const filename = `${sanitizeFileName(run.strategyName)}_${new Date(run.createdAt).toISOString().replace(/[:.]/g,'-')}.txt`;
                const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            };
        }
        if (collapseLogBtn) {
            // In the screenshot this button is a 'Clear' action — clear displayed logs
            collapseLogBtn.textContent = 'Clear';
            collapseLogBtn.onclick = () => {
                if (logRows) logRows.innerHTML = '';
                currentLines = [];
                const infoEl = document.getElementById('footer-info-count');
                const warnEl = document.getElementById('footer-warn-count');
                const errEl = document.getElementById('footer-error-count');
                const totalEl = document.getElementById('footer-total');
                if (infoEl) infoEl.textContent = `0 Info`;
                if (warnEl) warnEl.textContent = `0 Warning`;
                if (errEl) errEl.textContent = `0 Error`;
                if (totalEl) totalEl.textContent = `Total: 0 logs`;
            };
        }

        // Auto-scroll behavior
        if (modalAutoScrollBtn) {
            const active = modalAutoScrollBtn.getAttribute('data-active') === 'true';
            if (active) {
                const container = document.getElementById('log-viewer-content');
                if (container) container.scrollTop = container.scrollHeight;
            }
            modalAutoScrollBtn.onclick = () => {
                const isActive = modalAutoScrollBtn.getAttribute('data-active') === 'true';
                modalAutoScrollBtn.setAttribute('data-active', (!isActive).toString());
                modalAutoScrollBtn.style.opacity = isActive ? '0.7' : '1';
            };
        }

        // Search behavior
        if (modalSearchInput) {
            modalSearchInput.value = '';
            modalSearchInput.oninput = () => {
                const q = modalSearchInput.value.trim();
                renderSearchHighlight(q);
            };
        }

        outputModal.style.display = 'flex';
    }

    // Close modal
    closeModalBtn.addEventListener('click', () => {
        outputModal.style.display = 'none';
        if (logRows) logRows.innerHTML = '';
        currentLines = [];
    });

    outputModal.addEventListener('click', (e) => {
            if (e.target === outputModal) {
            outputModal.style.display = 'none';
            if (logRows) logRows.innerHTML = '';
            currentLines = [];
        }
    });

    // Render search highlights
    function renderSearchHighlight(query) {
        if (!logRows) return;
        if (!currentLines || currentLines.length === 0) return;
        if (!query) {
            logRows.innerHTML = currentLines.map((l, idx) => `\n                <div class="log-row">\n                    <span class="log-line-number">${idx+1}</span>\n                    <span class="log-line">${escapeHtml(l)}</span>\n                </div>`).join('\n');
            return;
        }
        const lower = query.toLowerCase();
        const newHtml = currentLines.map((l, idx) => {
            const li = l || '';
            const i = li.toLowerCase().indexOf(lower);
            if (i === -1) return `\n                <div class="log-row">\n                    <span class="log-line-number">${idx+1}</span>\n                    <span class="log-line">${escapeHtml(li)}</span>\n                </div>`;
            const before = escapeHtml(li.slice(0, i));
            const match = escapeHtml(li.slice(i, i + query.length));
            const after = escapeHtml(li.slice(i + query.length));
            return `\n                <div class="log-row">\n                    <span class="log-line-number">${idx+1}</span>\n                    <span class="log-line">${before}<span class="search-highlight">${match}</span>${after}</span>\n                </div>`;
        }).join('\n');
        logRows.innerHTML = newHtml;
        // Scroll to first match
        const first = logRows.querySelector('.search-highlight');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

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

    // Delete single run
    async function deleteRun(runId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/strategy/history/${runId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete run');
            }

            // Remove from allHistory and filteredHistory
            allHistory = allHistory.filter(run => run._id !== runId);
            filteredHistory = filteredHistory.filter(run => run._id !== runId);
            
            // Re-render the display
            displayedCount = 0;
            displayHistory();
            
            alert('Run deleted successfully!');
        } catch (error) {
            console.error('Error deleting run:', error);
            alert('Failed to delete run. Please try again.');
        }
    }

    // Clear all history
    const clearAllHistoryBtn = document.getElementById('clear-all-history');
    clearAllHistoryBtn.addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete ALL run history?\n\nThis will permanently delete ${allHistory.length} run(s) and cannot be undone!`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/strategy/history/all`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to clear history');
            }

            // Clear local data
            allHistory = [];
            filteredHistory = [];
            displayedCount = 0;
            
            // Clear the display
            historyContainer.innerHTML = '<div class="text-center py-12"><p class="m3-body-large" style="color: var(--on-surface-variant-color);">No run history found.</p></div>';
            
            alert('All history cleared successfully!');
        } catch (error) {
            console.error('Error clearing history:', error);
            alert('Failed to clear history. Please try again.');
        }
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
// Account dropdown and logout logic are handled centrally in `client/js/main.js`.
