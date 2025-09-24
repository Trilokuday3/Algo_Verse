document.addEventListener('DOMContentLoaded', () => {
    const strategiesContainer = document.getElementById('strategies-container');
    let logViewerModal = null; // This will hold the modal element after it's loaded

    // --- 1. Load the Log Viewer Modal into the page ---
    fetch('log-viewer.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            logViewerModal = document.getElementById('log-viewer-modal');
            
            // Add event listener to the modal's close button
            document.getElementById('close-log-viewer').addEventListener('click', () => {
                logViewerModal.classList.add('hidden');
                logViewerModal.classList.remove('flex');
            });
        });

    // --- 2. Connect to the WebSocket Server ---
    const socket = io('http://localhost:3000');
    socket.on('connect', () => {
        console.log('Connected to WebSocket server!');
    });

    // --- 3. Listen for incoming log messages ---
    socket.on('strategy-log', (data) => {
        const logContent = document.getElementById('log-viewer-content');
        // Check if the modal is open and if the incoming log belongs to the strategy being viewed
        if (logContent && !logViewerModal.classList.contains('hidden') && logViewerModal.dataset.strategyId === data.strategyId) {
            logContent.innerHTML += `<div>&gt; ${data.message}</div>`;
            logContent.scrollTop = logContent.scrollHeight; // Auto-scroll to the bottom
        }
    });

    // --- 4. Function to create a single strategy card ---
    function createStrategyCard(strategy) {
        const card = document.createElement('div');
        card.className = 'm3-card p-6 flex flex-col relative';
        
        const status = strategy.status || 'Stopped';
        const statusColor = status === 'Running' ? 'bg-green-500' : (status === 'Paused' ? 'bg-yellow-500' : 'bg-gray-500');
        const statusTextColor = status === 'Running' ? 'text-green-500' : (status === 'Paused' ? 'text-yellow-500' : 'text-gray-500');

        card.innerHTML = `
            <a href="terminal.html?strategyId=${strategy._id}" class="absolute top-4 right-4 m3-text-button p-2 rounded-full" title="Edit Strategy">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </a>
            <div class="flex-grow text-center">
                <h3 class="m3-title-large mb-2">${strategy.name}</h3>
                <p class="m3-body-large flex items-center justify-center ${statusTextColor}">
                    <span class="w-3 h-3 rounded-full ${statusColor} mr-2"></span>
                    <span>${status}</span>
                </p>
            </div>
            <div class="flex justify-center items-center space-x-2 mt-6">
                ${createActionButtons(strategy)}
            </div>
             <div class="flex justify-center mt-4">
                 <button data-id="${strategy._id}" class="delete-btn m3-text-button px-3 py-2 rounded-full text-xs" style="color: var(--md-sys-color-error);">Delete</button>
             </div>
        `;
        return card;
    }
    
    // --- 5. Function to create the correct set of action buttons based on status ---
    function createActionButtons(strategy) {
        let buttons = '';
        // Add "View Logs" button only if the strategy is running or paused
        if (strategy.status === 'Running' || strategy.status === 'Paused') {
            buttons += `<button data-id="${strategy._id}" data-name="${strategy.name}" class="view-logs-btn m3-tonal-button m3-label-large p-2 rounded-full" title="View Logs"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>`;
        }
        
        switch (strategy.status) {
            case 'Running':
                buttons += `<button data-id="${strategy._id}" class="pause-btn m3-tonal-button m3-label-large px-4 py-2 rounded-full">Pause</button>`;
                buttons += `<button data-id="${strategy._id}" class="stop-btn m3-filled-button m3-label-large px-4 py-2 rounded-full" style="background-color: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container);">Stop</button>`;
                break;
            case 'Paused':
                buttons += `<button data-id="${strategy._id}" class="resume-btn m3-filled-button m3-label-large px-4 py-2 rounded-full">Resume</button>`;
                buttons += `<button data-id="${strategy._id}" class="stop-btn m3-tonal-button m3-label-large px-4 py-2 rounded-full">Stop</button>`;
                break;
            default:
                buttons += `<button data-id="${strategy._id}" class="start-btn m3-filled-button m3-label-large px-4 py-2 rounded-full flex-1">Start</button>`;
        }
        return buttons;
    }

    // --- 6. Event listener for all button clicks on the page ---
    strategiesContainer.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const strategyId = target.dataset.id;
        
        if (target.classList.contains('view-logs-btn')) {
            const strategyName = target.dataset.name;
            if (logViewerModal) {
                document.getElementById('log-viewer-title').textContent = `Logs: ${strategyName}`;
                document.getElementById('log-viewer-content').innerHTML = '<div>Connecting to log stream...</div>';
                logViewerModal.dataset.strategyId = strategyId; // Set ID to filter incoming logs
                logViewerModal.classList.remove('hidden');
                logViewerModal.classList.add('flex');
            }
        } 
        else {
            let result;
            if (target.classList.contains('start-btn')) result = await startStrategy(strategyId);
            else if (target.classList.contains('stop-btn')) result = await stopStrategy(strategyId);
            else if (target.classList.contains('pause-btn')) result = await pauseStrategy(strategyId);
            else if (target.classList.contains('resume-btn')) result = await resumeStrategy(strategyId);
            else if (target.classList.contains('delete-btn')) {
                if (confirm('Are you sure you want to delete this strategy?')) {
                    result = await deleteStrategy(strategyId);
                }
            }
            if (result) {
                alert(result.message);
                loadStrategies(); // Refresh the entire view after any action
            }
        }
    });

    // --- 7. Function to fetch and display all strategies ---
    async function loadStrategies() {
        strategiesContainer.innerHTML = '<p class="m3-body-large col-span-full text-center" style="color: var(--on-surface-variant-color);">Loading...</p>';
        const strategies = await getStrategies();
        strategiesContainer.innerHTML = '';
        if (strategies && strategies.length > 0) {
            strategies.forEach(strategy => {
                const card = createStrategyCard(strategy);
                strategiesContainer.appendChild(card);
            });
        } else {
            strategiesContainer.innerHTML = '<p class="m3-body-large col-span-full text-center" style="color: var(--on-surface-variant-color);">You have not saved any strategies yet.</p>';
        }
    }

    // Initial load when the page is opened
    loadStrategies();
});

