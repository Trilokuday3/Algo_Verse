// This function runs when the HTML document is fully loaded.
document.addEventListener('DOMContentLoaded', () => {

    // --- Theme Toggle Logic ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const htmlElement = document.documentElement;

    /**
     * Applies the selected theme (dark or light) to the page
     * and updates the toggle button's icon.
     * @param {string} theme - The theme to apply ('dark' or 'light').
     */
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            htmlElement.classList.add('dark');
            if (themeIconLight && themeIconDark) {
                themeIconLight.classList.add('hidden');
                themeIconDark.classList.remove('hidden');
            }
        } else {
            htmlElement.classList.remove('dark');
            if (themeIconLight && themeIconDark) {
                themeIconLight.classList.remove('hidden');
                themeIconDark.classList.add('hidden');
            }
        }
    };

    // Check for a saved theme in localStorage or use the system preference.
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (prefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }

    // Add a click listener to the theme toggle button if it exists on the page.
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = htmlElement.classList.toggle('dark');
            const newTheme = isDark ? 'dark' : 'light';
            
            
            // Save the user's preference for future visits.
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // --- Account Dropdown Logic ---
    const accountButton = document.getElementById('account-button');
    const accountDropdown = document.getElementById('account-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (accountButton && accountDropdown) {
        // Toggle dropdown on button click
        accountButton.addEventListener('click', (e) => {
            e.stopPropagation();
            accountDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!accountButton.contains(e.target) && !accountDropdown.contains(e.target)) {
                accountDropdown.classList.add('hidden');
            }
        });
    }

    // --- Logout Button Logic ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear the authentication token
            localStorage.removeItem('token');
            // Clear session storage (including token notification flag)
            sessionStorage.clear();
            // Redirect to the login page
            window.location.href = 'login.html';
        });
    }

});

