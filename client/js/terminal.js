document.addEventListener('DOMContentLoaded', async () => {
    // Get all the necessary HTML elements from the page
    const runButton = document.getElementById('runStrategyBtn');
    const saveButton = document.getElementById('saveStrategyBtn');
    const codeEditor = document.getElementById('code-editor');
    const logOutput = document.getElementById('logs');
    const strategySelect = document.getElementById('strategy-select');
    const pageTitle = document.querySelector('h1.m3-headline-medium');

    let userStrategies = [];
    let currentStrategy = null; // This will hold the strategy we are currently editing

    // --- Function to populate the dropdown menu ---
    function populateStrategiesDropdown(strategies) {
        strategySelect.innerHTML = '<option value="">Load a saved strategy...</option>'; // Clear previous options
        if (strategies && Array.isArray(strategies)) {
            strategies.forEach(strategy => {
                const option = document.createElement('option');
                option.value = strategy._id;
                option.textContent = strategy.name;
                strategySelect.appendChild(option);
            });
        }
    }

    // --- Check the URL to see if we are editing a specific strategy ---
    const urlParams = new URLSearchParams(window.location.search);
    const strategyIdToEdit = urlParams.get('strategyId');

    if (strategyIdToEdit) {
        // If an ID is in the URL, fetch that specific strategy
        currentStrategy = await getStrategyById(strategyIdToEdit);
        if (currentStrategy && currentStrategy.name) {
            // Populate the page with the loaded strategy's data
            codeEditor.value = currentStrategy.code;
            pageTitle.textContent = `Editing: ${currentStrategy.name}`;
            saveButton.textContent = "Update Strategy"; // Change button text to "Update"
        }
    }

    // --- Load all strategies to populate the dropdown menu ---
    userStrategies = await getStrategies();
    populateStrategiesDropdown(userStrategies);
    

    // --- Event Handlers for Buttons and Dropdown ---

    // Handles running the code currently in the editor
    if (runButton) {
        runButton.addEventListener('click', async () => {
            const code = codeEditor.value;
            logOutput.innerText = '> Sending code to the server...';
            const result = await runStrategy(code);
            logOutput.innerText = result.output || result.message;
        });
    }
    
    // Handles saving (both new and updated strategies)
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            const code = codeEditor.value;
            let result;

            if (currentStrategy) { // If we are in "Edit Mode"
                const newName = prompt("Update the strategy name or leave blank to keep it:", currentStrategy.name);
                if (newName !== null) { // Check if user clicked "Cancel" on the prompt
                    // Call the updateStrategy function from api.js
                    result = await updateStrategy(currentStrategy._id, newName.trim() || currentStrategy.name, code);
                }
            } else { // If we are saving a brand new strategy
                const strategyName = prompt("Please enter a name for your new strategy:");
                if (strategyName && strategyName.trim() !== "") {
                    // Call the saveStrategy function from api.js
                    result = await saveStrategy(strategyName, code);
                }
            }
            
            if (result && result.message) {
                alert(result.message);
                if (result.message.includes("success")) {
                    // Redirect to the main strategies page on success
                    window.location.href = 'strategies.html';
                }
            }
        });
    }

    // Handles selecting a different strategy from the dropdown
    if (strategySelect) {
        strategySelect.addEventListener('change', (event) => {
            const strategyId = event.target.value;
            if (strategyId) {
                // Reload the page in edit mode for the selected strategy
                window.location.href = `terminal.html?strategyId=${strategyId}`;
            }
        });
    }
});

