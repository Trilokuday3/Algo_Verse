// Enhanced Log Viewer Functionality
console.log('log-viewer.js loaded');

let autoScrollEnabled = true;
let allLogs = [];
let logCounts = { info: 0, warning: 0, error: 0, success: 0 };
let logViewerInitialized = false;

// Cache element references globally
let logViewerContentElement = null;
let logViewerModalElement = null;

// Initialize log viewer when it's loaded
function initializeLogViewer() {
    console.log('initializeLogViewer called, already initialized?', logViewerInitialized);
    
    // Always try to cache elements if they're not already cached
    // Try both getElementById and querySelector
    if (!logViewerContentElement) {
        logViewerModalElement = document.getElementById('log-viewer-modal') || document.querySelector('[id="log-viewer-modal"]');
        logViewerContentElement = document.getElementById('log-viewer-content') || document.querySelector('[id="log-viewer-content"]');
        console.log('Cached elements - Modal:', !!logViewerModalElement, 'Content:', !!logViewerContentElement);
    }
    
    if (logViewerInitialized) {
        console.log('Already initialized, skipping event listeners');
        return;
    }
    
    const logViewerModal = logViewerModalElement;
    const closeButton = document.getElementById('close-log-viewer') || document.querySelector('[id="close-log-viewer"]');
    const logContent = logViewerContentElement;
    const searchInput = document.getElementById('log-search') || document.querySelector('[id="log-search"]');
    const autoScrollToggle = document.getElementById('auto-scroll-toggle') || document.querySelector('[id="auto-scroll-toggle"]');
    const copyLogsBtn = document.getElementById('copy-logs-btn') || document.querySelector('[id="copy-logs-btn"]');
    const clearLogsBtn = document.getElementById('clear-logs-btn') || document.querySelector('[id="clear-logs-btn"]');
    
    console.log('initializeLogViewer - Elements found:');
    console.log('  Modal:', !!logViewerModal);
    console.log('  Content:', !!logContent);
    console.log('  Close button:', !!closeButton);
    console.log('  Search:', !!searchInput);

    if (!logViewerModal) {
        console.error('Log viewer modal not found');
        return;
    }

    // Close modal
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            logViewerModal.classList.add('hidden');
            logViewerModal.classList.remove('flex');
        });
    }

    // Close on backdrop click
    logViewerModal.addEventListener('click', (e) => {
        if (e.target === logViewerModal) {
            logViewerModal.classList.add('hidden');
            logViewerModal.classList.remove('flex');
        }
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterLogs(searchTerm);
        });
    }

    // Auto-scroll toggle - set initial state
    if (autoScrollToggle) {
        autoScrollToggle.style.backgroundColor = 'var(--primary-container-color)';
        autoScrollToggle.style.color = 'var(--on-primary-container-color)';
        autoScrollToggle.style.borderColor = 'var(--primary-container-color)';
        
        autoScrollToggle.addEventListener('click', () => {
            autoScrollEnabled = !autoScrollEnabled;
            autoScrollToggle.setAttribute('data-active', autoScrollEnabled);
            
            if (autoScrollEnabled) {
                autoScrollToggle.style.backgroundColor = 'var(--primary-container-color)';
                autoScrollToggle.style.color = 'var(--on-primary-container-color)';
                autoScrollToggle.style.borderColor = 'var(--primary-container-color)';
            } else {
                autoScrollToggle.style.backgroundColor = 'transparent';
                autoScrollToggle.style.color = 'var(--on-surface-color)';
                autoScrollToggle.style.borderColor = 'var(--outline-color)';
            }
        });
    }

    // Copy logs
    if (copyLogsBtn) {
        copyLogsBtn.addEventListener('click', async () => {
            if (allLogs.length === 0) {
                alert('No logs to copy');
                return;
            }
            
            const logsText = allLogs.map(log => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`).join('\n');
            
            try {
                await navigator.clipboard.writeText(logsText);
                const originalText = copyLogsBtn.querySelector('span').textContent;
                copyLogsBtn.querySelector('span').textContent = 'Copied!';
                setTimeout(() => {
                    copyLogsBtn.querySelector('span').textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy logs:', err);
                alert('Failed to copy logs to clipboard');
            }
        });
    }

    // Clear logs
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            if (allLogs.length === 0) {
                alert('No logs to clear');
                return;
            }
            
            if (confirm('Are you sure you want to clear all logs?')) {
                allLogs = [];
                logCounts = { info: 0, warning: 0, error: 0, success: 0 };
                updateLogDisplay();
                updateLogCounts();
            }
        });
    }
    
    logViewerInitialized = true;
    console.log('Log viewer initialized successfully');
}

// Function to open log viewer
function openLogViewer(strategyName = 'Strategy') {
    console.log('=== openLogViewer called with:', strategyName);
    
    // Initialize if not already done
    initializeLogViewer();
    
    // Use cached element references
    const modal = logViewerModalElement;
    const title = document.getElementById('log-viewer-title');
    const logContent = logViewerContentElement;
    
    console.log('Modal element found:', !!modal);
    console.log('Title element found:', !!title);
    console.log('Log content element found:', !!logContent);
    
    if (title) {
        title.textContent = `${strategyName} Logs`;
    }
    
    if (modal && logContent) {
        // Clear previous logs when opening
        allLogs = [];
        logCounts = { info: 0, warning: 0, error: 0, success: 0 };
        console.log('Cleared all logs');
        
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        console.log('Modal classes updated - should be visible');
        
        // Show empty state initially
        logContent.innerHTML = `
            <div class="text-center py-12" style="color: #888;">
                <p class="m3-body-large" style="color: #888;">Waiting for logs...</p>
            </div>
        `;
        
        // Reset counts display
        updateLogCounts();
        console.log('=== openLogViewer completed');
    } else {
        console.error('Modal or log content element not found!');
    }
}

// Function to add a log entry
function addLog(message, type = 'info') {
    console.log('addLog called:', message, type);
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    const logType = type.toLowerCase();
    const log = {
        timestamp,
        type: logType,
        message,
        id: Date.now() + Math.random()
    };
    
    allLogs.push(log);
    console.log('Total logs now:', allLogs.length);
    
    // Update counts - map success to info for counting
    const countType = logType === 'success' ? 'info' : logType;
    if (logCounts.hasOwnProperty(countType)) {
        logCounts[countType] = (logCounts[countType] || 0) + 1;
    } else {
        logCounts.info = (logCounts.info || 0) + 1;
    }
    
    updateLogDisplay();
    updateLogCounts();
    
    if (autoScrollEnabled) {
        setTimeout(scrollToBottom, 50);
    }
}

// Function to update log display
function updateLogDisplay(filter = '') {
    console.log('updateLogDisplay called');
    console.log('  logViewerContentElement cached?', !!logViewerContentElement);
    console.log('  Trying getElementById as fallback...');
    
    // Use cached element reference, with multiple fallbacks
    let logContent = logViewerContentElement;
    
    // Fallback 1: try getElementById
    if (!logContent) {
        logContent = document.getElementById('log-viewer-content');
        console.log('  Fallback getElementById result:', !!logContent);
    }
    
    // Fallback 2: try querySelector with attribute selector
    if (!logContent) {
        logContent = document.querySelector('[id="log-viewer-content"]');
        console.log('  Fallback querySelector result:', !!logContent);
    }
    
    // Fallback 3: try querySelector with class
    if (!logContent) {
        logContent = document.querySelector('.flex-1.p-6.font-mono');
        console.log('  Fallback querySelector by class result:', !!logContent);
    }
    
    // If we found it with fallback, update the cache
    if (logContent && !logViewerContentElement) {
        logViewerContentElement = logContent;
        console.log('  Updated cache with fallback element');
    }
    
    if (!logContent) {
        console.error('Log content element not found - modal not initialized yet');
        console.error('  logViewerContentElement is null');
        console.error('  All fallback methods failed');
        return;
    }
    
    console.log('updateLogDisplay - element found! allLogs:', allLogs.length, 'filter:', filter);
    
    if (allLogs.length === 0) {
        logContent.innerHTML = `
            <div class="text-center py-12" style="color: #888;">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 opacity-50">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <p class="m3-body-large opacity-70" style="color: #888;">No logs available</p>
                <p class="m3-body-small opacity-50 mt-2" style="color: #666;">Logs will appear here when the strategy starts running</p>
            </div>
        `;
        console.log('Showing empty state');
        return;
    }
    
    const filteredLogs = filter 
        ? allLogs.filter(log => 
            log.message.toLowerCase().includes(filter) || 
            log.type.toLowerCase().includes(filter)
          )
        : allLogs;
    
    console.log('Filtered logs:', filteredLogs.length);
    
    const logsHTML = filteredLogs.map(log => {
        const colors = {
            info: '#4ade80',    // green
            success: '#22c55e', // darker green
            warning: '#fbbf24', // yellow
            error: '#ef4444'    // red
        };
        
        const color = colors[log.type] || colors.info;
        
        return `
            <div class="log-entry mb-2 py-1 px-3 rounded hover:bg-black/5 transition-colors" style="border-left: 3px solid ${color};">
                <span style="color: #666;">[${log.timestamp}]</span>
                <span style="color: ${color}; font-weight: 600;"> ${log.type.toUpperCase()}</span>
                <span style="color: #1a1a1a;">: ${escapeHtml(log.message)}</span>
            </div>
        `;
    }).join('');
    
    if (logsHTML) {
        logContent.innerHTML = logsHTML;
        console.log('Logs rendered successfully');
    } else {
        logContent.innerHTML = `
            <div class="text-center py-12" style="color: #888;">
                <p class="m3-body-large opacity-70">No logs match your search</p>
            </div>
        `;
        console.log('No matching logs found');
    }
}

// Function to filter logs
function filterLogs(searchTerm) {
    updateLogDisplay(searchTerm);
}

// Function to update log counts
function updateLogCounts() {
    const infoCount = document.getElementById('log-count-info');
    const warningCount = document.getElementById('log-count-warning');
    const errorCount = document.getElementById('log-count-error');
    const totalCount = document.getElementById('total-logs');
    
    if (infoCount) infoCount.textContent = `${logCounts.info || 0} Info`;
    if (warningCount) warningCount.textContent = `${logCounts.warning || 0} Warning`;
    if (errorCount) errorCount.textContent = `${logCounts.error || 0} Error`;
    if (totalCount) totalCount.textContent = `Total: ${allLogs.length} logs`;
}

// Function to scroll to bottom
function scrollToBottom() {
    const logContent = document.getElementById('log-viewer-content');
    if (logContent) {
        logContent.scrollTop = logContent.scrollHeight;
    }
}

// Function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for use in other scripts
window.initializeLogViewer = initializeLogViewer;
window.openLogViewer = openLogViewer;
window.addLog = addLog;
