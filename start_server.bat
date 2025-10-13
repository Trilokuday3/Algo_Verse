@echo off
echo ╔═══════════════════════════════════════════════════════════╗
echo ║              STARTING ALGO-RUNNER SERVER                  ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo Starting server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

cd server
node src/server.js
