document.addEventListener('DOMContentLoaded', async () => {
    console.log("Dashboard script loaded.");
    
    // Check the server status as soon as the dashboard loads
    const serverStatus = await checkServerStatus();
    
    console.log("Response from server:", serverStatus);

    // You can update the UI based on the response
    const brokerStatusElement = document.getElementById('broker-status-text');
    if (brokerStatusElement) {
        if (serverStatus.status === 'ok') {
            // This just confirms the frontend can talk to the backend.
            // In the future, we would check the actual broker connection status.
            brokerStatusElement.textContent = 'Connected to Backend';
        } else {
            brokerStatusElement.textContent = 'Backend Error';
        }
    }
});