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
        const navLinks = document.querySelectorAll('.nav-link');
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        if (theme === 'dark') {
            htmlElement.classList.remove('light');
            htmlElement.classList.add('dark');
            
            if (themeIconLight && themeIconDark) {
                themeIconLight.classList.add('hidden');
                themeIconDark.classList.remove('hidden');
            }
        } else {
            htmlElement.classList.remove('dark');
            htmlElement.classList.add('light');
            
            if (themeIconLight && themeIconDark) {
                themeIconLight.classList.remove('hidden');
                themeIconDark.classList.add('hidden');
            }
        }

        // Highlight active page with violet background
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('data-page');
            const linkHref = link.getAttribute('href').split('#')[0];
            const isActive = currentPage.includes(linkPage) || linkHref === currentPage;
            
            if (isActive) {
                // Active page gets strong violet background with white text (same in both modes)
                link.classList.add('!bg-violet-600', '!text-white', 'font-semibold');
                link.classList.remove('text-violet-700', 'dark:text-violet-200', 'hover:bg-violet-200', 'dark:hover:bg-gray-700');
            } else {
                link.classList.remove('!bg-violet-600', '!text-white', 'font-semibold');
            }
        });
    };

    // Check for a saved theme in localStorage or use the system preference.
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Determine and apply the current theme
    let currentTheme = 'light';
    if (savedTheme) {
        currentTheme = savedTheme;
    } else if (prefersDark) {
        currentTheme = 'dark';
    } else {
        currentTheme = 'light';
    }

    // Store current theme globally so it persists across function calls
    window.currentAppTheme = currentTheme;

    // Add a click listener to the theme toggle button if it exists on the page.
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = htmlElement.classList.toggle('dark');
            const newTheme = isDark ? 'dark' : 'light';
            window.currentAppTheme = newTheme; // Store globally
            
            // Save the user's preference for future visits.
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }
    
    // Apply theme after DOM is ready (ensures header elements exist)
    // Use setTimeout to ensure header HTML is fully inserted into DOM
    setTimeout(() => {
        applyTheme(window.currentAppTheme);
    }, 0);

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

