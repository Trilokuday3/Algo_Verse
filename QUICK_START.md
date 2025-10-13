# 🚀 Algo-Runner - Quick Start Guide

## ✅ What's Been Done

Your application has been upgraded to use a **scalable 3-database architecture**:

### 📊 Database Structure
```
MongoDB Atlas Cluster: 3lok.5802e.mongodb.net
├── user_db         → User authentication & profiles
├── strategy_db     → Trading strategies (unlimited growth)
└── credentials_db  → Encrypted broker credentials
```

### 🎯 Current Data
- ✅ **4 Users** migrated
- ✅ **6 Strategies** migrated
- ✅ **4 Credential sets** migrated
- ✅ **All data properly linked** by userId

---

## 🏃 How to Start the Server

### Option 1: Using PowerShell Script (Recommended)
```powershell
.\start_server.ps1
```

### Option 2: Using Batch File
```cmd
start_server.bat
```

### Option 3: Manual Command
```bash
cd server
node src/server.js
```

### ✅ Server Started Successfully When You See:
```
✓ User Database (user_db) connected successfully.
✓ Strategy Database (strategy_db) connected successfully.
✓ Credentials Database (credentials_db) connected successfully.
🚀 All MongoDB databases connected successfully.
Server is listening on http://localhost:3000
```

---

## 🌐 How to Access the Application

1. **Start the Server** (see above)
2. **Open Frontend** in Live Server or browser:
   - Login Page: `http://127.0.0.1:5500/client/login.html`
   - Or: `file:///path/to/client/login.html`

3. **Login with any existing user**:
   - trilokeshvenkatauday@gmail.com
   - vnews55555@gmail.com
   - 2004varshithreddy@gmail.com
   - uday200533@gmail.com

---

## 🔍 Troubleshooting

### Problem: "Could not connect to the server"

**Solution:**
1. Make sure the server is running:
   ```bash
   .\start_server.ps1
   ```
2. Check if port 3000 is available:
   ```powershell
   Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
   ```
3. If port is in use, kill the process:
   ```powershell
   Get-Process -Name node | Stop-Process -Force
   ```
   Then restart the server.

### Problem: "MongoDB connection failed"

**Solution:**
1. Check your `.env` file has all three MongoDB URIs:
   ```env
   MONGO_USER_URI=mongodb+srv://...
   MONGO_STRATEGY_URI=mongodb+srv://...
   MONGO_CREDENTIALS_URI=mongodb+srv://...
   ```
2. Verify MongoDB Atlas is accessible
3. Check your network connection

### Problem: "Strategies not showing up"

**Solution:**
The databases ARE properly linked. If strategies don't show:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console (F12) for errors
4. Verify server is running and connected

---

## 🛠️ Useful Commands

### Check Database Status
```bash
node verify_databases.js
```

### Test Database Links
```bash
node final_verification.js
```

### View All Data
```bash
node verify_databases.js
```

### Stop All Node Processes
```powershell
Get-Process -Name node | Stop-Process -Force
```

---

## 📁 Important Files

### Configuration
- `server/.env` - Environment variables (MongoDB URIs, JWT secret, encryption key)
- `server/src/config/db.js` - Database connections

### Models
- `server/src/models/User.model.js` - User authentication & profile
- `server/src/models/UserStrategy.model.js` - Strategy data
- `server/src/models/Credentials.model.js` - Broker credentials

### Server
- `server/src/server.js` - Main Express server with all API routes

---

## 🎓 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Strategies
- `GET /api/strategies` - Get all user strategies
- `POST /api/strategies` - Create new strategy
- `PUT /api/strategies/:id` - Update strategy
- `DELETE /api/strategies/:id` - Delete strategy
- `POST /api/strategies/:id/start` - Start strategy
- `POST /api/strategies/:id/stop` - Stop strategy
- `POST /api/strategies/:id/pause` - Pause strategy
- `POST /api/strategies/:id/resume` - Resume strategy

### User Profile
- `GET /api/user/profile` - Get user profile (aggregates from all 3 DBs)
- `PUT /api/user/profile` - Update profile
- `POST /api/user/change-password` - Change password
- `DELETE /api/user/delete` - Delete account

### Credentials
- `POST /api/credentials` - Save/update broker credentials

### Terminal
- `POST /api/run` - Run Python code

### Dashboard
- `GET /api/dashboard` - Get dashboard data

---

## 🔐 Security Notes

- All credentials are encrypted using AES-256-CBC
- JWT tokens for authentication
- Passwords hashed with bcrypt
- Separate database for sensitive credentials

---

## 📊 Database Architecture Benefits

### Before (Single Database)
- All data in one database
- User documents grew with strategies
- Performance degraded with scale
- Hard to backup/restore selectively

### After (3 Databases)
- ✅ Unlimited strategy growth
- ✅ Smaller, faster user queries
- ✅ Isolated credential security
- ✅ Independent scaling
- ✅ Selective backup/restore
- ✅ Clear separation of concerns

---

## 🆘 Need Help?

If you encounter issues:

1. Check server logs in terminal
2. Check browser console (F12)
3. Run verification scripts:
   ```bash
   node final_verification.js
   ```
4. Ensure all dependencies are installed:
   ```bash
   cd server
   npm install
   ```

---

## ✨ Your Application is Ready!

**Server:** http://localhost:3000  
**Frontend:** http://127.0.0.1:5500/client/login.html  
**Database:** MongoDB Atlas (3 separate databases)  
**Status:** ✅ All systems operational

---

**Last Updated:** October 13, 2025  
**Version:** 2.0 (Multi-Database Architecture)
