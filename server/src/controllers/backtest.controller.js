const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Store backtest results temporarily (in production, use database)
const backtestResults = new Map();

// Run backtest
exports.runBacktest = async (req, res) => {
    try {
        const { 
            strategyCode, 
            startDate, 
            endDate, 
            initialCapital = 100000,
            symbol,
            broker 
        } = req.body;

        // Validate inputs
        if (!strategyCode || !startDate || !endDate || !symbol) {
            return res.status(400).json({ 
                error: 'Missing required parameters: strategyCode, startDate, endDate, symbol' 
            });
        }

        // Generate unique backtest ID
        const backtestId = uuidv4();

        // Create temporary directory for backtest
        const backtestDir = path.join(__dirname, '../../temp/backtests', backtestId);
        await fs.mkdir(backtestDir, { recursive: true });

        // Save strategy code to file
        const strategyFilePath = path.join(backtestDir, 'strategy.py');
        await fs.writeFile(strategyFilePath, strategyCode);

        // Create backtest wrapper script
        const backtestWrapper = `
import sys
import json
from datetime import datetime
import pandas as pd
import numpy as np

# Import the user's strategy
sys.path.append('${backtestDir.replace(/\\/g, '\\\\')}')
from strategy import *

class BacktestEngine:
    def __init__(self, initial_capital, start_date, end_date, symbol):
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.start_date = datetime.strptime(start_date, '%Y-%m-%d')
        self.end_date = datetime.strptime(end_date, '%Y-%m-%d')
        self.symbol = symbol
        self.positions = []
        self.trades = []
        self.pnl = 0
        
    def load_historical_data(self):
        """Load historical data for the symbol"""
        # In production, fetch real historical data from broker API or data provider
        # For now, generate sample data
        date_range = pd.date_range(self.start_date, self.end_date, freq='1min')
        data = pd.DataFrame({
            'timestamp': date_range,
            'open': np.random.uniform(100, 150, len(date_range)),
            'high': np.random.uniform(100, 150, len(date_range)),
            'low': np.random.uniform(100, 150, len(date_range)),
            'close': np.random.uniform(100, 150, len(date_range)),
            'volume': np.random.randint(1000, 10000, len(date_range))
        })
        return data
        
    def run(self):
        """Run the backtest"""
        data = self.load_historical_data()
        
        # Simulate strategy execution on historical data
        for idx, row in data.iterrows():
            # Here you would execute the strategy logic
            # This is a simplified example
            pass
            
        # Calculate results
        total_trades = len(self.trades)
        winning_trades = sum(1 for t in self.trades if t.get('pnl', 0) > 0)
        losing_trades = total_trades - winning_trades
        
        results = {
            'backtestId': '${backtestId}',
            'symbol': self.symbol,
            'startDate': '${startDate}',
            'endDate': '${endDate}',
            'initialCapital': self.initial_capital,
            'finalCapital': self.capital,
            'totalPnL': self.pnl,
            'totalTrades': total_trades,
            'winningTrades': winning_trades,
            'losingTrades': losing_trades,
            'winRate': (winning_trades / total_trades * 100) if total_trades > 0 else 0,
            'maxDrawdown': self.calculate_max_drawdown(),
            'sharpeRatio': self.calculate_sharpe_ratio(),
            'trades': self.trades[:100]  # Limit to first 100 trades
        }
        
        return results
        
    def calculate_max_drawdown(self):
        """Calculate maximum drawdown"""
        # Simplified calculation
        return 0
        
    def calculate_sharpe_ratio(self):
        """Calculate Sharpe ratio"""
        # Simplified calculation
        return 0

# Run backtest
if __name__ == '__main__':
    engine = BacktestEngine(
        initial_capital=${initialCapital},
        start_date='${startDate}',
        end_date='${endDate}',
        symbol='${symbol}'
    )
    
    results = engine.run()
    print(json.dumps(results))
`;

        const backtestScriptPath = path.join(backtestDir, 'backtest.py');
        await fs.writeFile(backtestScriptPath, backtestWrapper);

        // Execute backtest
        exec(`python "${backtestScriptPath}"`, { 
            cwd: backtestDir,
            timeout: 60000 // 1 minute timeout
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('Backtest execution error:', error);
                console.error('stderr:', stderr);
                
                // Clean up temp directory
                fs.rm(backtestDir, { recursive: true, force: true }).catch(console.error);
                
                return res.status(500).json({ 
                    error: 'Backtest execution failed', 
                    message: stderr || error.message 
                });
            }

            try {
                // Parse results
                const results = JSON.parse(stdout);
                
                // Store results
                backtestResults.set(backtestId, {
                    ...results,
                    userId: req.userId,
                    timestamp: new Date()
                });

                // Clean up temp directory
                fs.rm(backtestDir, { recursive: true, force: true }).catch(console.error);

                res.json({ 
                    success: true,
                    backtestId,
                    results 
                });
            } catch (parseError) {
                console.error('Error parsing backtest results:', parseError);
                console.error('stdout:', stdout);
                
                // Clean up temp directory
                fs.rm(backtestDir, { recursive: true, force: true }).catch(console.error);
                
                res.status(500).json({ 
                    error: 'Failed to parse backtest results',
                    message: parseError.message
                });
            }
        });

    } catch (error) {
        console.error('Error running backtest:', error);
        res.status(500).json({ 
            error: 'Failed to run backtest', 
            message: error.message 
        });
    }
};

// Get backtest results
exports.getBacktestResults = async (req, res) => {
    try {
        const { backtestId } = req.params;
        
        const results = backtestResults.get(backtestId);
        
        if (!results) {
            return res.status(404).json({ error: 'Backtest results not found' });
        }

        // Verify ownership
        if (results.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ 
            success: true,
            results 
        });

    } catch (error) {
        console.error('Error fetching backtest results:', error);
        res.status(500).json({ 
            error: 'Failed to fetch backtest results', 
            message: error.message 
        });
    }
};

// Get backtest history
exports.getBacktestHistory = async (req, res) => {
    try {
        // Filter backtests for current user
        const userBacktests = Array.from(backtestResults.entries())
            .filter(([_, result]) => result.userId === req.userId)
            .map(([id, result]) => ({
                backtestId: id,
                symbol: result.symbol,
                startDate: result.startDate,
                endDate: result.endDate,
                totalPnL: result.totalPnL,
                winRate: result.winRate,
                timestamp: result.timestamp
            }))
            .sort((a, b) => b.timestamp - a.timestamp);

        res.json({ 
            success: true,
            backtests: userBacktests 
        });

    } catch (error) {
        console.error('Error fetching backtest history:', error);
        res.status(500).json({ 
            error: 'Failed to fetch backtest history', 
            message: error.message 
        });
    }
};
