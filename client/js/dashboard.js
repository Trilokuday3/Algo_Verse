document.addEventListener('DOMContentLoaded', async () => {
    const netWorthEl = document.getElementById('net-worth');
    const pnlEl = document.getElementById('pnl');
    const strategiesEl = document.getElementById('active-strategies');
    const statusEl = document.getElementById('broker-status-text');
    const statusIconEl = document.getElementById('broker-status-icon');
    const positionsTableBody = document.getElementById('positions-tbody');

    // Show loading state
    netWorthEl.textContent = 'Loading...';
    pnlEl.textContent = 'Loading...';

    const data = await getDashboardData();

    if (data.error || data.brokerData.error) {
        statusEl.textContent = 'Connection Error';
        statusIconEl.classList.remove('bg-green-500');
        statusIconEl.classList.add('bg-red-500');
        netWorthEl.textContent = 'N/A';
        pnlEl.textContent = 'N/A';
        return;
    }

    // --- Populate the dashboard with the fetched data ---
    
    // Example: Assuming your get_funds() returns an object like { available_balance: 10000, pnl: 120 }
    // You will need to adjust these lines based on the EXACT structure of your 'funds' and 'positions' data.
    const funds = data.brokerData.funds;
    if (funds) {
        netWorthEl.textContent = `$${funds.available_balance?.toLocaleString() || 'N/A'}`;
        pnlEl.textContent = `${funds.pnl > 0 ? '+' : ''}$${funds.pnl?.toLocaleString() || 'N/A'}`;
        if (funds.pnl < 0) {
            pnlEl.classList.add('text-red-500');
            pnlEl.classList.remove('text-green-500');
        }
    }
    
    strategiesEl.textContent = data.activeStrategies;
    statusEl.textContent = 'Connected';

    // Populate positions table
    const positions = data.brokerData.positions;
    if (positions && Array.isArray(positions)) {
        positionsTableBody.innerHTML = ''; // Clear any placeholder rows
        positions.forEach(pos => {
            const pnlClass = pos.pnl > 0 ? 'text-green-500' : 'text-red-500';
            const row = `
                <tr>
                    <td class="py-2 pr-4 font-bold">${pos.tradingSymbol}</td>
                    <td class="py-2 pr-4 text-right">${pos.quantity}</td>
                    <td class="py-2 pr-4 text-right">${pos.ltp}</td>
                    <td class="py-2 pr-4 text-right font-bold ${pnlClass}">${pos.pnl > 0 ? '+' : ''}${pos.pnl.toFixed(2)}</td>
                </tr>
            `;
            positionsTableBody.innerHTML += row;
        });
    }
});