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

    // Broker modal elements
    const brokerModal = document.getElementById('broker-modal');
    const brokerModalTitle = document.getElementById('broker-modal-title');
    const brokerModalDescription = document.getElementById('broker-modal-description');
    const brokerOptions = document.getElementById('broker-options');
    const cancelBrokerBtn = document.getElementById('cancel-broker-btn');
    const confirmBrokerBtn = document.getElementById('confirm-broker-btn');

    let userStrategies = [];
    let currentStrategy = null; // Will hold the strategy being edited if we are in "edit mode"
    let userCredentials = []; // Will hold user's configured brokers
    let selectedBroker = null; // Currently selected broker
    let pendingAction = null; // 'save', 'update', or 'run'

    // Broker display names
    const brokerNames = {
        'dhan': 'Dhan',
        'zerodha': 'Zerodha',
        'upstox': 'Upstox',
        'angelone': 'Angel One'
    };

    // --- Check the URL to see if we are editing an existing strategy ---
    const urlParams = new URLSearchParams(window.location.search);
    const strategyIdToEdit = urlParams.get('strategyId');

    if (strategyIdToEdit) {
        // If an ID is found in the URL, fetch that strategy's data
        currentStrategy = await getStrategyById(strategyIdToEdit);
        if (currentStrategy) {
            console.log('Loaded strategy for editing:', currentStrategy);
            console.log('Strategy broker:', currentStrategy.broker);
            
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

    // --- Load user credentials to know which brokers are configured ---
    try {
        userCredentials = await getCredentials();
        console.log('Loaded credentials:', userCredentials); // Debug log
        console.log('Number of brokers:', userCredentials ? userCredentials.length : 0); // Debug log
        if (!userCredentials || userCredentials.length === 0) {
            addLog('> Warning: No broker credentials found. Please add credentials in Profile page.', 'warning');
        } else {
            addLog(`> Loaded ${userCredentials.length} broker credential(s)`, 'success');
        }
    } catch (error) {
        console.error("Could not load user credentials.", error);
        addLog('> Error loading broker credentials. Some features may not work.', 'error');
    }

    // --- Broker Selection Modal Functions ---
    function showBrokerModal(action) {
        console.log('showBrokerModal called with action:', action); // Debug
        console.log('Current strategy:', currentStrategy); // Debug
        
        pendingAction = action;
        selectedBroker = null;
        confirmBrokerBtn.disabled = true;

        // Update modal title and description based on action
        if (action === 'update' && currentStrategy) {
            brokerModalTitle.textContent = 'Update Broker';
            brokerModalDescription.textContent = `Current broker: ${brokerNames[currentStrategy.broker] || currentStrategy.broker}. Select a new broker or keep the current one.`;
        } else if (action === 'save') {
            // For new strategy
            const strategyName = window.tempStrategyName || 'your strategy';
            brokerModalTitle.textContent = 'Select Broker';
            brokerModalDescription.textContent = `Choose which broker to use for "${strategyName}"`;
        } else {
            brokerModalTitle.textContent = 'Select Broker';
            brokerModalDescription.textContent = 'Choose which broker to use for this strategy';
        }

        // Clear previous options
        brokerOptions.innerHTML = '';

        // Show ALL available brokers (not just configured ones)
        const allBrokers = ['dhan', 'zerodha', 'upstox', 'angelone'];
        
        // Get the current broker if we're editing a strategy
        const currentBroker = (action === 'update' && currentStrategy && currentStrategy.broker) 
            ? currentStrategy.broker.toLowerCase() 
            : null;
        
        console.log('Creating broker options for all brokers:', allBrokers); // Debug
        console.log('Current strategy broker:', currentBroker); // Debug

        // Create radio buttons for each broker
        allBrokers.forEach(broker => {
            console.log('Adding broker option:', broker); // Debug
            
            const brokerDiv = document.createElement('div');
            brokerDiv.className = 'flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-500/10 transition-all';
            brokerDiv.style.borderColor = 'var(--outline-color)';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'broker';
            radio.value = broker;
            radio.id = `broker-${broker}`;
            radio.className = 'mr-3 w-4 h-4';
            
            // Pre-select the current broker when editing
            if (currentBroker && broker === currentBroker) {
                radio.checked = true;
                selectedBroker = broker;
                confirmBrokerBtn.disabled = false;
                brokerDiv.style.borderColor = 'var(--primary-color)';
                brokerDiv.style.backgroundColor = 'var(--primary-container-color)';
                console.log('Pre-selected broker:', broker); // Debug
            }
            
            const label = document.createElement('label');
            label.htmlFor = `broker-${broker}`;
            label.className = 'm3-body-large cursor-pointer flex-1';
            label.textContent = brokerNames[broker] || broker;
            
            // Check if user has credentials for this broker
            const hasCredentials = userCredentials && userCredentials.some(cred => cred.broker === broker);
            
            // Add indicator if credentials are not configured
            if (!hasCredentials) {
                const badge = document.createElement('span');
                badge.className = 'm3-label-small px-2 py-1 rounded ml-2';
                badge.style.backgroundColor = 'var(--error-container-color, #fee)';
                badge.style.color = 'var(--on-error-container-color, #c00)';
                badge.textContent = 'No credentials';
                brokerDiv.appendChild(badge);
            }
            
            // Add "Current" badge if this is the current broker
            if (currentBroker && broker === currentBroker) {
                const currentBadge = document.createElement('span');
                currentBadge.className = 'm3-label-small px-2 py-1 rounded ml-2';
                currentBadge.style.backgroundColor = 'var(--primary-container-color)';
                currentBadge.style.color = 'var(--on-primary-container-color)';
                currentBadge.textContent = 'Current';
                brokerDiv.appendChild(currentBadge);
            }
            
            brokerDiv.appendChild(radio);
            brokerDiv.appendChild(label);
            
            // Click on div selects radio
            brokerDiv.addEventListener('click', (e) => {
                const clickedBroker = radio.value; // Get broker from radio value
                console.log('Broker clicked:', clickedBroker); // Debug
                
                radio.checked = true;
                selectedBroker = clickedBroker;
                confirmBrokerBtn.disabled = false;
                
                console.log('selectedBroker updated to:', selectedBroker); // Debug
                
                // Update visual selection
                document.querySelectorAll('#broker-options > div').forEach(div => {
                    div.style.borderColor = 'var(--outline-color)';
                    div.style.backgroundColor = '';
                });
                brokerDiv.style.borderColor = 'var(--primary-color)';
                brokerDiv.style.backgroundColor = 'var(--primary-container-color)';
            });
            
            brokerOptions.appendChild(brokerDiv);
        });

        brokerModal.classList.remove('hidden');
        brokerModal.classList.add('flex');
        return true;
    }

    function hideBrokerModal() {
        brokerModal.classList.add('hidden');
        brokerModal.classList.remove('flex');
        selectedBroker = null;
        pendingAction = null;
    }

    // Cancel button
    cancelBrokerBtn.addEventListener('click', hideBrokerModal);

    // Confirm button
    confirmBrokerBtn.addEventListener('click', async () => {
        console.log('Confirm broker button clicked');
        console.log('Selected broker:', selectedBroker);
        console.log('Pending action:', pendingAction);
        
        if (!selectedBroker) {
            console.warn('No broker selected!');
            return;
        }
        
        // Store pendingAction and selectedBroker BEFORE hideBrokerModal clears them
        const action = pendingAction;
        const broker = selectedBroker;
        
        hideBrokerModal();
        
        // Execute the pending action
        if (action === 'run') {
            console.log('Executing run with broker:', broker);
            await executeRun(broker);
        } else if (action === 'save') {
            console.log('Executing save with broker:', broker);
            await executeSave(broker);
        } else if (action === 'update') {
            console.log('Executing update with broker:', broker);
            await executeUpdate(broker);
        } else {
            console.error('Unknown pending action:', action);
        }
    });

    // Close modal when clicking outside
    brokerModal.addEventListener('click', (e) => {
        if (e.target === brokerModal) {
            hideBrokerModal();
        }
    });

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
            
            // Show broker selection modal
            showBrokerModal('run');
        });
    }

    // Function to execute strategy run with selected broker
    async function executeRun(broker) {
        const code = codeEditor.value.trim();
        
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
        
        addLog(`> Running strategy with ${brokerNames[broker]}...`, 'info');
        addLog('> Sending code to server...', 'info');
        
        try {
            const result = await runStrategy(code, broker);
            
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
    }
    
    // Handle "Save" button click (for both new and existing strategies)
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            console.log('Save button clicked');
            
            const code = codeEditor.value.trim();
            console.log('Code:', code.substring(0, 50) + '...', 'Length:', code.length);
            
            if (!code) {
                alert('Please write some code before saving.');
                return;
            }
            
            if (currentStrategy) {
                console.log('Editing existing strategy:', currentStrategy.name);
                // If we are editing, ask for broker and update
                showBrokerModal('update');
            } else {
                console.log('Creating new strategy');
                // If this is a new strategy, ask for name first, then broker
                const strategyName = prompt("Please enter a name for your new strategy:");
                
                console.log('User entered name:', strategyName);
                
                if (!strategyName || !strategyName.trim()) {
                    if (strategyName !== null) {
                        alert('Strategy name cannot be empty.');
                    }
                    return;
                }
                
                // Store the name temporarily and show broker modal
                window.tempStrategyName = strategyName.trim();
                console.log('Stored tempStrategyName:', window.tempStrategyName);
                console.log('Showing broker modal for save...');
                showBrokerModal('save');
            }
        });
    } else {
        console.error('Save button not found!');
    }

    // Function to save new strategy with selected broker
    async function executeSave(broker) {
        console.log('executeSave called with broker:', broker);
        
        const code = codeEditor.value.trim();
        
        // Get the strategy name that was already entered
        const strategyName = window.tempStrategyName;
        
        console.log('tempStrategyName:', strategyName);
        console.log('Code length:', code.length);
        
        if (!strategyName) {
            alert('Strategy name is missing. Please try again.');
            delete window.tempStrategyName;
            return;
        }
        
        const finalName = strategyName.trim();
        
        if (!finalName) {
            alert('Strategy name cannot be empty. Please try again.');
            delete window.tempStrategyName;
            return;
        }
        
        // Clear the temporary name
        delete window.tempStrategyName;
        
        saveButton.disabled = true;
        addLog(`> Saving new strategy "${finalName}" with ${brokerNames[broker]}...`, 'info');
        
        try {
            console.log('Calling saveStrategy API...', { name: finalName, broker, codeLength: code.length });
            const result = await saveStrategy(finalName, code, broker);
            
            console.log('Save result:', result);
            
            saveButton.disabled = false;
            
            if (result && result.message) {
                addLog('> ' + result.message, result.error ? 'error' : 'success');
                
                if (!result.error) {
                    // Show broker information in success message
                    const successMessage = `✅ Strategy saved successfully with broker: ${brokerNames[broker]}!\n\n${result.message}`;
                    addLog(`> Strategy saved with broker: ${brokerNames[broker]}`, 'success');
                    
                    alert(successMessage);
                    // Go to the "My Strategies" page to see the saved list
                    setTimeout(() => {
                        window.location.href = 'strategies.html';
                    }, 1000);
                } else {
                    alert(result.message);
                }
            } else {
                console.error('No result or message from saveStrategy');
                alert('Error: No response from server');
            }
        } catch (error) {
            console.error('Error in executeSave:', error);
            saveButton.disabled = false;
            addLog('> Error: ' + error.message, 'error');
            alert('Error saving strategy: ' + error.message);
        }
    }

    // Function to update existing strategy with selected broker
    async function executeUpdate(broker) {
        console.log('executeUpdate called with broker:', broker); // Debug
        console.log('currentStrategy before update:', currentStrategy); // Debug
        
        const code = codeEditor.value.trim();
        const newName = prompt("Update the strategy name or leave blank to keep it:", currentStrategy.name);
        
        if (newName === null) return; // User clicked cancel
        
        // Use the new name if provided, otherwise keep current name
        const finalName = (newName && newName.trim()) ? newName.trim() : currentStrategy.name;
        
        // Check if broker is changing
        const oldBroker = currentStrategy.broker;
        const isBrokerChanging = broker.toLowerCase() !== oldBroker.toLowerCase();
        
        console.log('Updating strategy:');
        console.log('- ID:', currentStrategy._id);
        console.log('- Old name:', currentStrategy.name);
        console.log('- New name:', finalName);
        console.log('- Old broker:', oldBroker);
        console.log('- New broker:', broker);
        console.log('- Broker changing:', isBrokerChanging);
        
        saveButton.disabled = true;
        addLog(`> Updating strategy with ${brokerNames[broker]}...`, 'info');
        
        try {
            const result = await updateStrategy(
                currentStrategy._id, 
                finalName, 
                code,
                broker
            );
            
            console.log('Update result:', result);
            
            saveButton.disabled = false;
            
            if (result && result.message) {
                addLog('> ' + result.message, result.error ? 'error' : 'success');
                
                if (!result.error) {
                    // Update currentStrategy with the new broker so subsequent edits see the correct broker
                    if (result.strategy) {
                        console.log('Before update - currentStrategy.broker:', currentStrategy.broker);
                        console.log('New broker from result:', result.strategy.broker);
                        
                        currentStrategy.broker = result.strategy.broker;
                        currentStrategy.name = result.strategy.name;
                        currentStrategy.code = result.strategy.code;
                        
                        console.log('After update - currentStrategy.broker:', currentStrategy.broker);
                        console.log('Full currentStrategy:', currentStrategy);
                    } else {
                        console.warn('No strategy object in result!', result);
                    }
                    
                    // Show specific message if broker was changed
                    let successMessage = result.message;
                    if (isBrokerChanging) {
                        successMessage = `✅ Your broker has been changed from ${brokerNames[oldBroker]} to ${brokerNames[broker]} for this strategy!\n\n${result.message}`;
                        addLog(`> Broker changed: ${brokerNames[oldBroker]} → ${brokerNames[broker]}`, 'success');
                    }
                    
                    alert(successMessage);
                    // Force a complete page reload to ensure fresh data
                    addLog('> Redirecting to strategies page...', 'info');
                    setTimeout(() => {
                        window.location.href = 'strategies.html?refresh=' + Date.now();
                    }, 500);
                } else {
                    alert(result.message);
                }
            }
        } catch (error) {
            saveButton.disabled = false;
            addLog('> Error: ' + error.message, 'error');
            alert('Error updating strategy: ' + error.message);
        }
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
        if (currentStrategy.broker) {
            addLog(`> Broker: ${brokerNames[currentStrategy.broker] || currentStrategy.broker}`, 'info');
        }
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
