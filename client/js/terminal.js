document.addEventListener('DOMContentLoaded', async () => {
    // Update account icon with user's email initial
    await updateAccountIcon();

    // Get all the necessary HTML elements from the page
    const runButton = document.getElementById('run-strategy-btn');
    const saveButton = document.getElementById('save-strategy-btn');
    const codeEditor = document.getElementById('code-editor');
    const logOutput = document.getElementById('logs');
    const strategySelect = document.getElementById('strategy-select');
    const newStrategyBtn = document.getElementById('new-strategy');
    const clearLogsBtn = document.getElementById('clear-logs');
    const pageTitle = document.querySelector('h1.m3-headline-large'); // Get the page title element

    let userStrategies = [];
    let currentStrategy = null; // Will hold the strategy being edited if we are in "edit mode"

    // --- Check the URL to see if we are editing an existing strategy ---
    const urlParams = new URLSearchParams(window.location.search);
    const strategyIdToEdit = urlParams.get('strategyId');

    if (strategyIdToEdit) {
        // If an ID is found in the URL, fetch that strategy's data
        currentStrategy = await getStrategyById(strategyIdToEdit);
        if (currentStrategy) {
            // Populate the editor and update the title
            codeEditor.value = currentStrategy.code;
            if(pageTitle) pageTitle.textContent = `Editing: ${currentStrategy.name}`;
            
            // Manually update the character counter
            const charCount = document.getElementById('char-count');
            if (charCount) {
                charCount.textContent = `${currentStrategy.code.length} chars`;
            }
        }
    }

    // --- Function to fill the dropdown with saved strategies ---
    function populateStrategiesDropdown(strategies) {
        strategySelect.innerHTML = '<option value="">Load a saved strategy...</option>'; // Reset dropdown
        if (strategies && Array.isArray(strategies)) {
            strategies.forEach(strategy => {
                const option = document.createElement('option');
                option.value = strategy._id;
                option.textContent = strategy.name;
                strategySelect.appendChild(option);
            });
        }
    }

    // --- Load all strategies for the dropdown when the page first loads ---
    try {
        userStrategies = await getStrategies();
        populateStrategiesDropdown(userStrategies);
    } catch (error) {
        console.error("Could not load initial strategies.", error);
    }

    // --- Event Handlers ---

    // Handle "New Strategy" button click
    if (newStrategyBtn) {
        newStrategyBtn.addEventListener('click', () => {
            // Clear editor and reset state
            codeEditor.value = '';
            currentStrategy = null;
            if (pageTitle) pageTitle.textContent = 'Strategy Terminal';
            if (strategySelect) strategySelect.value = '';
            addLog('> New strategy initialized. Ready to write code.', 'info');
            
            // Reset the character counter
            const charCount = document.getElementById('char-count');
            if (charCount) {
                charCount.textContent = '0 chars';
            }
        });
    }

    // Handle "Run Strategy" button click
    if (runButton) {
        runButton.addEventListener('click', async () => {
            const code = codeEditor.value.trim();
            
            if (!code) {
                addLog('> Error: Code editor is empty. Please write some code first.', 'error');
                return;
            }
            
            runButton.disabled = true;
            runButton.innerHTML = `
                <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <span>Running...</span>
            `;
            
            addLog('> Sending code to server...', 'info');
            addLog('> Please wait, executing strategy...', 'info');
            
            try {
                const result = await runStrategy(code);
                
                if (result.output) {
                    addLog('> Execution completed!', 'success');
                    addLog('> Output:', 'info');
                    addLog(result.output, 'output');
                } else if (result.error) {
                    addLog('> Execution failed:', 'error');
                    addLog(result.error, 'error');
                } else {
                    addLog('> No output received from server.', 'warning');
                }
            } catch (error) {
                addLog('> Error: ' + error.message, 'error');
            } finally {
                runButton.disabled = false;
                runButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Run Strategy</span>
                `;
            }
        });
    }
    
    // Handle "Save" button click (for both new and existing strategies)
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            const code = codeEditor.value.trim();
            
            if (!code) {
                alert('Please write some code before saving.');
                return;
            }
            
            let result;

            if (currentStrategy) {
                // If we are editing, update the existing strategy
                const newName = prompt("Update the strategy name or leave blank to keep it:", currentStrategy.name);
                if (newName !== null) { // Check if user clicked "Cancel"
                    saveButton.disabled = true;
                    addLog('> Updating strategy...', 'info');
                    result = await updateStrategy(currentStrategy._id, newName || currentStrategy.name, code);
                }
            } else {
                // If this is a new strategy, ask for a name and save it
                const strategyName = prompt("Please enter a name for your new strategy:");
                if (strategyName && strategyName.trim()) {
                    saveButton.disabled = true;
                    addLog('> Saving new strategy...', 'info');
                    result = await saveStrategy(strategyName.trim(), code);
                } else if (strategyName !== null) {
                    alert('Strategy name cannot be empty.');
                    return;
                }
            }
            
            saveButton.disabled = false;
            
            if (result) {
                addLog('> ' + result.message, 'success');
                alert(result.message);
                // Go to the "My Strategies" page to see the saved/updated list
                setTimeout(() => {
                    window.location.href = 'strategies.html';
                }, 1000);
            }
        });
    }

    // Handle selecting a strategy from the dropdown
    if (strategySelect) {
        strategySelect.addEventListener('change', (event) => {
            const strategyId = event.target.value;
            if (strategyId) {
                // When a user selects a strategy, reload the page in "edit mode" for that strategy
                window.location.href = `terminal.html?strategyId=${strategyId}`;
            }
        });
    }

    // Helper function to add formatted logs
    function addLog(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = 'flex items-start space-x-2 mb-1';
        
        let color = 'var(--primary-color)';
        let symbol = '>';
        
        switch(type) {
            case 'success':
                color = '#10b981'; // green
                symbol = '✓';
                break;
            case 'error':
                color = '#ef4444'; // red
                symbol = '✗';
                break;
            case 'warning':
                color = '#f59e0b'; // orange
                symbol = '⚠';
                break;
            case 'output':
                color = 'var(--on-surface-variant-color)';
                symbol = '';
                logEntry.innerHTML = `<pre class="whitespace-pre-wrap font-mono text-xs">${escapeHtml(message)}</pre>`;
                logOutput.appendChild(logEntry);
                logOutput.scrollTop = logOutput.scrollHeight;
                return;
            case 'info':
            default:
                color = 'var(--primary-color)';
                symbol = '>';
        }
        
        logEntry.innerHTML = `
            <span style="color: ${color};">${symbol}</span>
            <span>${escapeHtml(message)}</span>
        `;
        
        logOutput.appendChild(logEntry);
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add initial log if editing existing strategy
    if (currentStrategy) {
        addLog(`> Loaded strategy: ${currentStrategy.name}`, 'success');
        addLog('> Ready to edit and run.', 'info');
    }
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
