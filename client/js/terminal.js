document.addEventListener('DOMContentLoaded', async () => {
    // Get all the necessary HTML elements
    const runButton = document.getElementById('runStrategyBtn');
    const saveButton = document.getElementById('saveStrategyBtn');
    const codeEditor = document.getElementById('code-editor');
    const logOutput = document.getElementById('logs');
    const strategySelect = document.getElementById('strategy-select');

    let userStrategies = []; // To hold the strategies fetched from the server

    // --- Function to populate the dropdown ---
    function populateStrategiesDropdown(strategies) {
        strategySelect.innerHTML = '<option value="">Load a saved strategy...</option>'; // Reset dropdown
        if (strategies && Array.isArray(strategies)) {
            strategies.forEach(strategy => {
                const option = document.createElement('option');
                option.value = strategy._id; // The unique ID from the database
                option.textContent = strategy.name;
                strategySelect.appendChild(option);
            });
        }
    }

    // --- Load initial strategies when the page loads ---
    try {
        userStrategies = await getStrategies();
        populateStrategiesDropdown(userStrategies);
    } catch (error) {
        console.error("Could not load initial strategies.", error);
    }
    

    // --- Event Handlers ---

    // Handles running the code in the editor
    if (runButton) {
        runButton.addEventListener('click', async () => {
            const code = codeEditor.value;
            logOutput.innerText = '> Sending code to the server...\n> Please wait...';
            const result = await runStrategy(code);
            logOutput.innerText = result.output || result.message;
        });
    }
    
    // Handles saving the code in the editor
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            const strategyName = prompt("Please enter a name for your strategy:");
            if (strategyName && strategyName.trim() !== "") {
                const code = codeEditor.value;
                const result = await saveStrategy(strategyName, code);
                alert(result.message);
                
                // Refresh the strategy list after saving a new one
                if (result.strategies) {
                    userStrategies = result.strategies;
                    populateStrategiesDropdown(userStrategies);
                }
            }
        });
    }

    // Handles loading a strategy when one is selected from the dropdown
    if (strategySelect) {
        strategySelect.addEventListener('change', (event) => {
            const strategyId = event.target.value;
            if (strategyId) {
                const selectedStrategy = userStrategies.find(s => s._id === strategyId);
                if (selectedStrategy) {
                    codeEditor.value = selectedStrategy.code;
                }
            }
        });
    }
});