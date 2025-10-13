document.addEventListener('DOMContentLoaded', async () => {
    // Update account icon with user's email initial
    await updateAccountIcon();

    // Get all the elements we need to update
    const netWorthEl = document.getElementById('net-worth');
    const pnlEl = document.getElementById('pnl');
    const strategiesEl = document.getElementById('saved-strategies');
    const statusTextEl = document.getElementById('broker-status-text');
    const statusIconEl = document.getElementById('broker-status-icon');
    const positionsTableBody = document.getElementById('positions-tbody');

    // --- Function to format numbers as currency ---
    function formatCurrency(value) {
        if (typeof value !== 'number') return 'N/A';
        return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }

    // --- Fetch and Display Data ---
    try {
        const data = await getDashboardData();

        // Handle errors from the API call or from the broker
        if (data.error || (data.brokerData && data.brokerData.error)) {
            statusTextEl.textContent = 'Connection Error';
            statusIconEl.classList.remove('bg-green-500');
            statusIconEl.classList.add('bg-red-500');
            netWorthEl.textContent = 'N/A';
            pnlEl.textContent = 'N/A';
            positionsTableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center">Could not load data.</td></tr>';
            return;
        }

        // --- Populate the Stat Cards ---
        statusTextEl.textContent = 'Connected';
        statusIconEl.classList.remove('bg-gray-500', 'bg-red-500');
        statusIconEl.classList.add('bg-green-500');
        
        // Note: The property names like 'available_balance' and 'pnl' must exactly match what your Python script returns.
        const funds = data.brokerData.funds;
        if (funds) {
            netWorthEl.textContent = formatCurrency(funds.available_balance);
            pnlEl.textContent = formatCurrency(funds.pnl);
            if (funds.pnl < 0) {
                pnlEl.classList.add('text-red-500');
                pnlEl.classList.remove('text-green-500'); // Ensure green is removed if it was there
            } else {
                pnlEl.classList.add('text-green-500');
                pnlEl.classList.remove('text-red-500');
            }
        }
        
        strategiesEl.textContent = data.activeStrategies; // This comes from user.strategies.length

        // --- Populate the Positions Table ---
        const positions = data.brokerData.positions;
        if (positions && Array.isArray(positions) && positions.length > 0) {
            positionsTableBody.innerHTML = ''; // Clear the "Loading..." message
            positions.forEach(pos => {
                const pnlClass = pos.pnl >= 0 ? 'text-green-500' : 'text-red-500';
                const row = `
                    <tr>
                        <td class="py-2 pr-4 font-bold">${pos.tradingSymbol || 'N/A'}</td>
                        <td class="py-2 pr-4 text-right">${pos.quantity || 0}</td>
                        <td class="py-2 pr-4 text-right">${pos.ltp || 0}</td>
                        <td class="py-2 pr-4 text-right font-bold ${pnlClass}">
                            ${formatCurrency(pos.pnl)}
                        </td>
                    </tr>
                `;
                positionsTableBody.innerHTML += row;
            });
        } else {
            // If there are no positions, show a message
            positionsTableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center" style="color: var(--on-surface-variant-color);">No open positions.</td></tr>';
        }

    } catch (error) {
        console.error("An unexpected error occurred:", error);
        statusTextEl.textContent = 'Client Error';
    }
});

// Function to update account icon with user's email initial
async function updateAccountIcon() {
    try {
        const profile = await getUserProfile();
        if (profile && profile.email) {
            const email = profile.email;
            const avatarLetter = email.charAt(0).toUpperCase();
            
            // Update the button icon
            const accountIcon = document.getElementById('account-icon');
            if (accountIcon) {
                accountIcon.textContent = avatarLetter;
            }
            
            // Update dropdown email
            const dropdownEmail = document.getElementById('dropdown-email');
            if (dropdownEmail) {
                dropdownEmail.textContent = email;
            }
            
            // Update dropdown avatar text
            const dropdownAvatarText = document.getElementById('dropdown-avatar-text');
            if (dropdownAvatarText) {
                dropdownAvatarText.textContent = avatarLetter;
            }
        }
    } catch (error) {
        console.error('Error updating account icon:', error);
    }
}

