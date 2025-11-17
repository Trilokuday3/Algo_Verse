# Cloud Deployment Fix Guide

## Problem
The cloud-deployed application at `13.201.224.180` was not working because:
1. Client-side code was hardcoded to `localhost:3000`
2. CORS settings on server were too restrictive
3. WebSocket connections were pointing to localhost

## What Was Fixed

### 1. Created Environment Configuration (`client/js/config.js`)
- Automatically detects if running on localhost or production
- Switches between development and production URLs
- Development: `http://localhost:3000`
- Production: `http://13.201.224.180:3000`

### 2. Updated All Client Files
- ✅ `client/js/api.js` - Dynamic API_BASE_URL
- ✅ `client/js/strategies.js` - Dynamic WebSocket URL
- ✅ `client/js/dashboard.js` - Dynamic API calls
- ✅ `client/js/history.js` - Dynamic API calls
- ✅ `client/login.html` - Added config.js import
- ✅ `client/dashboard.html` - Added config.js import
- ✅ `client/strategies.html` - Added config.js import
- ✅ `client/history.html` - Added config.js import
- ✅ `client/profile.html` - Added config.js import

### 3. Updated Server CORS Settings (`server/src/server.js`)
- Now accepts requests from cloud IP
- Allows WebSocket connections from production
- Supports credentials/authentication

## Deployment Steps

### Step 1: Deploy Updated Files to Cloud Server

```powershell
# SSH into your cloud server (adjust command as needed)
ssh your-user@13.201.224.180

# Or use your cloud provider's console/file manager
```

### Step 2: Copy Updated Files
Upload these files to your cloud server:
- `client/js/config.js` (NEW FILE)
- `client/js/api.js`
- `client/js/strategies.js`
- `client/js/dashboard.js`
- `client/js/history.js`
- `client/login.html`
- `client/dashboard.html`
- `client/strategies.html`
- `client/history.html`
- `client/profile.html`
- `server/src/server.js`

### Step 3: Restart the Server

```bash
# If using PM2
pm2 restart all

# If using Docker
docker-compose restart

# If using systemd
sudo systemctl restart your-app-name

# Or manual restart
cd /path/to/server
npm install
node src/server.js
```

### Step 4: Test the Application

1. Open browser and navigate to: `http://13.201.224.180:5500/client/login.html`
   (Or wherever your client is hosted)

2. Check browser console (F12) for:
   - "🌍 Environment: Production"
   - "📡 API Base URL: http://13.201.224.180:3000"
   - "🔌 WebSocket URL: http://13.201.224.180:3000"

3. Try logging in - should connect to cloud server successfully

## Important Notes

### Port Configuration
Current setup assumes:
- Server API: Port `3000`
- Client: Port `5500` (or served directly)

If your ports are different, update `client/js/config.js`:
```javascript
production: {
    API_BASE_URL: 'http://13.201.224.180:YOUR_PORT',
    WS_URL: 'http://13.201.224.180:YOUR_PORT'
}
```

### HTTPS Setup (Recommended for Production)
For production, you should use HTTPS:

1. Get SSL certificate (Let's Encrypt, Cloudflare, etc.)
2. Update `client/js/config.js`:
```javascript
production: {
    API_BASE_URL: 'https://yourdomain.com',
    WS_URL: 'https://yourdomain.com'
}
```
3. Configure server to use HTTPS

### Firewall Rules
Ensure these ports are open on your cloud server:
- Port `3000` - API server
- Port `5500` - Client (if using separate web server)

### Alternative: Domain Name
Instead of IP address, consider using a domain:
```javascript
production: {
    API_BASE_URL: 'http://yourdomain.com:3000',
    WS_URL: 'http://yourdomain.com:3000'
}
```

## Testing Locally
Your local development still works! When accessing via:
- `http://localhost` or `http://127.0.0.1` → Uses localhost:3000
- Any other hostname → Uses production URL

## Troubleshooting

### Issue: Still getting "Connection has timed out"
1. Check if server is running: `curl http://13.201.224.180:3000/api/health`
2. Verify firewall allows port 3000
3. Check server logs for errors
4. Ensure MongoDB is connected

### Issue: CORS errors in browser console
1. Clear browser cache and reload
2. Check server logs for CORS errors
3. Verify updated `server.js` is deployed

### Issue: WebSocket not connecting
1. Check browser console for WebSocket errors
2. Verify port 3000 allows WebSocket connections
3. Some cloud providers block WebSocket - check settings

### Issue: 404 on config.js
1. Ensure `client/js/config.js` file exists on server
2. Check file permissions
3. Verify HTML files include the config.js script tag

## Quick Verification Checklist

- [ ] `config.js` file exists in `client/js/`
- [ ] All HTML files have `<script src="./js/config.js"></script>` BEFORE other scripts
- [ ] Server has updated CORS settings
- [ ] Server is restarted with new code
- [ ] Port 3000 is accessible from internet
- [ ] Browser console shows "Production" environment
- [ ] No CORS errors in browser console

## Next Steps After Deployment

1. **Monitor server logs** for any errors
2. **Test all features**:
   - Login/Registration
   - Strategy creation
   - Dashboard loading
   - WebSocket real-time updates
3. **Set up HTTPS** for security
4. **Configure a domain name** for better accessibility
5. **Set up monitoring** (PM2, DataDog, etc.)

## Need Help?
If issues persist:
1. Share server logs
2. Share browser console errors (F12)
3. Share network tab showing failed requests
