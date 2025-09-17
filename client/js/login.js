document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const result = await loginOrRegister(email, password);

            if (result.token) {
                localStorage.setItem('token', result.token);
                alert(result.message);
                window.location.href = 'dashboard.html';
            } else {
                alert(result.message);
            }
        });
    }
});