document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Create an object with all the credential values from the form
            const credentials = {
                clientId: document.getElementById('client-id').value,
                accessToken: document.getElementById('token-id').value,
                brokerUsername: document.getElementById('broker-username').value,
                brokerPassword: document.getElementById('broker-password').value,
                totpSecret: document.getElementById('totp-secret').value
            };

            const result = await saveCredentials(credentials);
            alert(result.message);
        });
    }
});