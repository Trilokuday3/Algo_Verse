// This function runs when the HTML document is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    initializeHeader();
});

// Expose this function globally so it can be called after dynamically loading header
window.initializeHeader = function() {
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
        const header = document.querySelector('.m3-top-app-bar');
        const navLinks = document.querySelectorAll('.nav-link');
        const logoText = document.querySelector('.m3-title-large');
        const themeToggle = document.getElementById('theme-toggle');
        
        if (theme === 'dark') {
            htmlElement.classList.add('dark');
            // Update header background for dark mode
            if (header) {
                header.style.backgroundColor = 'rgba(17, 24, 39, 0.95)';
                header.style.borderBottom = '1px solid rgb(55, 65, 81)';
            }
            // Update text colors for dark mode
            if (logoText) {
                logoText.style.color = 'rgb(243, 244, 246)'; // gray-100
            }
            navLinks.forEach(link => {
                link.style.color = 'rgb(209, 213, 219)'; // gray-300
            });
            if (themeToggle) {
                themeToggle.style.color = 'rgb(209, 213, 219)'; // gray-300
            }
            if (themeIconLight && themeIconDark) {
                themeIconLight.classList.add('hidden');
                themeIconDark.classList.remove('hidden');
            }
        } else {
            htmlElement.classList.remove('dark');
            // Update header background for light mode
            if (header) {
                header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                header.style.borderBottom = '1px solid rgb(229, 231, 235)';
            }
            // Update text colors for light mode
            if (logoText) {
                logoText.style.color = 'rgb(17, 24, 39)'; // gray-900
            }
            navLinks.forEach(link => {
                link.style.color = 'rgb(55, 65, 81)'; // gray-700
            });
            if (themeToggle) {
                themeToggle.style.color = 'rgb(55, 65, 81)'; // gray-700
            }
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
};

