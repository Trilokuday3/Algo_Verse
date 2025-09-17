document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent page reload

            // Get the values from the form inputs
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            console.log(`Attempting to log in with ${email}...`);

            // Call our new API function
            const result = await loginUser(email, password);

            console.log("Login API response:", result);

            if (result.success) {
                // If login is successful, show a success message and redirect
                alert(result.message);
                window.location.href = 'dashboard.html';
            } else {
                // If login fails, show the error message from the server
                alert(result.message);
            }
        });
    }
});