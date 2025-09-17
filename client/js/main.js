// This function will run when the entire HTML document has been loaded.
document.addEventListener('DOMContentLoaded', () => {

    // --- Theme Toggle Logic ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const htmlElement = document.documentElement;

    // Function to apply the correct theme and icon state
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

    // Check for a saved theme in localStorage on page load
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (prefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }

    // Add click event listener to the toggle button if it exists
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = htmlElement.classList.toggle('dark');
            const newTheme = isDark ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

});