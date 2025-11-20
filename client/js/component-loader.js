document.addEventListener('DOMContentLoaded', () => {
    const headerPlaceholder = document.getElementById('header-placeholder');

    if (headerPlaceholder) {
        // Add cache-busting parameter to force fresh header load
        fetch(`./components/header.html?v=${Date.now()}`, {
            cache: 'no-store'
        })
            .then(response => response.text())
            .then(data => {
                headerPlaceholder.innerHTML = data;
            });
    }
});