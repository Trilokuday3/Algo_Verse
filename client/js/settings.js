document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const clientIdInput = document.getElementById('client-id');
            const accessTokenInput = document.getElementById('token-id');

            const credentials = {
                clientId: clientIdInput.value,
                accessToken: accessTokenInput.value
            };

            const result = await saveCredentials(credentials);
            
            // Show the success or error message from the server
            alert(result.message);

            // CORRECTED: If the save was successful, clear the input fields.
            // Checks for "securely" to match the server's success message.
            if (result.message.includes('securely')) {
                clientIdInput.value = '';
                accessTokenInput.value = '';
            }
        });
    }
});

