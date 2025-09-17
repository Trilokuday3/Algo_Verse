document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const clientId = document.getElementById('client-id').value;
            const accessToken = document.getElementById('token-id').value;

            const result = await saveCredentials(clientId, accessToken);

            alert(result.message);
        });
    }
});