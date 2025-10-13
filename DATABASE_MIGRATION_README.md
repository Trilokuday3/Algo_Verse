# Database Architecture Migration

## Overview
Successfully migrated from a single MongoDB database to a multi-database architecture for improved scalability and security.

## Architecture Changes

### Before (Single Database)
```
algo_runner_db
  └── users (collection)
      ├── email, password
      ├── firstName, lastName, phone
      ├── strategies[] (embedded array)
      └── credentials (embedded fields)
```

### After (Three Separate Databases)
```
user_db
  └── users (collection)
      ├── email, password
      ├── firstName, lastName, phone
      └── timestamps

strategy_db
  └── strategies (collection)
      ├── userId (reference)
      ├── name, code
      ├── status, containerId
      └── timestamps
      [Indexed on: userId, userId+name (unique)]

credentials_db
  └── credentials (collection)
      ├── userId (unique reference)
      ├── broker (enum)
      ├── clientId, accessToken (encrypted)
      ├── brokerUsername, brokerPassword (encrypted)
      ├── totpSecret, apiKey, apiSecret (encrypted)
      └── timestamps
```

## Benefits

### Scalability
- **Strategy Growth**: Unlimited strategies without bloating user documents
- **Horizontal Scaling**: Each database can be scaled independently
- **Query Performance**: Smaller documents = faster queries

### Security
- **Credential Isolation**: Sensitive broker credentials in separate database
- **Backup Strategy**: Can backup/restore databases independently
- **Access Control**: Can apply different security policies per database

### Maintainability
- **Separation of Concerns**: Clear boundaries between data types
- **Schema Evolution**: Easier to modify individual schemas
- **Testing**: Can test features with isolated databases

## Database Connections

### Environment Variables Required
```env
# MongoDB Connection URIs
MONGO_USER_URI=mongodb://localhost:27017/user_db
MONGO_STRATEGY_URI=mongodb://localhost:27017/strategy_db
MONGO_CREDENTIALS_URI=mongodb://localhost:27017/credentials_db

# If using MongoDB Atlas or remote server:
# MONGO_USER_URI=mongodb+srv://username:password@cluster.mongodb.net/user_db
# MONGO_STRATEGY_URI=mongodb+srv://username:password@cluster.mongodb.net/strategy_db
# MONGO_CREDENTIALS_URI=mongodb+srv://username:password@cluster.mongodb.net/credentials_db
```

## Files Modified

### New Model Files
1. **server/src/models/UserStrategy.model.js**
   - Exports: `getStrategyModel()`
   - Schema: userId, name, code, status, containerId
   - Uses: `strategyConnection`

2. **server/src/models/Credentials.model.js**
   - Exports: `getCredentialsModel()`
   - Schema: userId, broker, encrypted credentials
   - Uses: `credentialsConnection`

### Updated Files
1. **server/src/config/db.js**
   - Created three separate connections
   - Exports: `connectDB()` and `getConnections()`

2. **server/src/models/User.model.js**
   - Removed: strategies array, credentials fields
   - Kept: email, password, profile fields
   - Exports: `getUserModel()` function

3. **server/src/server.js**
   - All routes updated to use model getter functions
   - Changed from embedded data to separate collections
   - Added cascade delete for account deletion

## Updated Routes

### Authentication Routes
- ✅ POST `/api/auth/register` - Uses `getUserModel()`
- ✅ POST `/api/auth/login` - Uses `getUserModel()`

### Credentials Routes
- ✅ POST `/api/credentials` - Uses `getCredentialsModel()` with upsert

### Strategy Routes
- ✅ GET `/api/strategies` - Fetch all strategies by userId
- ✅ POST `/api/strategies` - Create strategy in strategy_db
- ✅ GET `/api/strategies/:id` - Get single strategy with userId verification
- ✅ PUT `/api/strategies/:id` - Update strategy with duplicate check
- ✅ DELETE `/api/strategies/:id` - Delete from strategy_db
- ✅ POST `/api/strategies/:id/start` - Gets credentials from credentials_db
- ✅ POST `/api/strategies/:id/stop` - Updates strategy status
- ✅ POST `/api/strategies/:id/pause` - Updates strategy status
- ✅ POST `/api/strategies/:id/resume` - Updates strategy status

### Terminal Routes
- ✅ POST `/api/run` - Uses `getCredentialsModel()` for credentials

### Dashboard Routes
- ✅ GET `/api/dashboard` - Aggregates from strategy_db and credentials_db

### Profile Routes
- ✅ GET `/api/user/profile` - Aggregates from all 3 databases
- ✅ PUT `/api/user/profile` - Updates user_db only
- ✅ POST `/api/user/change-password` - Updates user_db only
- ✅ DELETE `/api/user/delete` - Cascade delete from all 3 databases

## Code Patterns

### Before (Embedded Pattern)
```javascript
const user = await User.findById(userId);
user.strategies.push(newStrategy);
await user.save();
```

### After (Reference Pattern)
```javascript
const Strategy = getStrategyModel();
const newStrategy = new Strategy({ userId, ...data });
await newStrategy.save();
```

### Fetching Related Data
```javascript
// Get user
const User = getUserModel();
const user = await User.findById(userId);

// Get user's strategies
const Strategy = getStrategyModel();
const strategies = await Strategy.find({ userId });

// Get user's credentials
const Credentials = getCredentialsModel();
const credentials = await Credentials.findOne({ userId });
```

## Migration Steps (If Needed)

If you have existing data in the old format, create a migration script:

```javascript
// migration.js
const { connectDB, getConnections } = require('./config/db');
const getUserModel = require('./models/User.model');
const getStrategyModel = require('./models/UserStrategy.model');
const getCredentialsModel = require('./models/Credentials.model');

async function migrate() {
    await connectDB();
    
    const User = getUserModel();
    const Strategy = getStrategyModel();
    const Credentials = getCredentialsModel();
    
    const users = await User.find({});
    
    for (const user of users) {
        // Migrate strategies
        if (user.strategies && user.strategies.length > 0) {
            for (const strat of user.strategies) {
                await Strategy.create({
                    userId: user._id,
                    name: strat.name,
                    code: strat.code,
                    status: strat.status,
                    containerId: strat.containerId
                });
            }
        }
        
        // Migrate credentials
        if (user.clientId || user.accessToken) {
            await Credentials.create({
                userId: user._id,
                broker: user.broker || 'TradeHull',
                clientId: user.clientId,
                accessToken: user.accessToken,
                brokerUsername: user.brokerUsername,
                brokerPassword: user.brokerPassword,
                totpSecret: user.totpSecret
            });
        }
        
        // Clean old fields from user document
        user.strategies = undefined;
        user.clientId = undefined;
        user.accessToken = undefined;
        user.brokerUsername = undefined;
        user.brokerPassword = undefined;
        user.totpSecret = undefined;
        await user.save();
    }
    
    console.log('Migration completed!');
    process.exit(0);
}

migrate().catch(console.error);
```

## Testing

### Start the Server
```bash
cd server
npm install
node src/server.js
```

### Verify Connections
Look for these messages in console:
```
MongoDB user_db connected successfully
MongoDB strategy_db connected successfully
MongoDB credentials_db connected successfully
Server is listening on http://localhost:3000
```

### Test Endpoints
1. Register a new user → Creates entry in `user_db`
2. Save credentials → Creates/updates entry in `credentials_db`
3. Create strategy → Creates entry in `strategy_db`
4. Get profile → Aggregates data from all 3 databases

## Performance Notes

### Indexes
- `strategies` collection: Indexed on `userId` and compound `userId+name` (unique)
- `credentials` collection: Indexed on `userId` (unique)

### Query Optimization
- Use `.select()` to limit fields when needed
- Consider using `.lean()` for read-only queries
- Use `.countDocuments()` instead of `.length` for counts

### Future Enhancements
- Consider sharding strategy_db as it grows
- Add read replicas for high-traffic scenarios
- Implement caching layer for frequently accessed data

## Rollback Plan

If issues arise, you can temporarily revert by:
1. Keep the old User model as a backup
2. Use environment variable to toggle between architectures
3. Create a reverse migration script

## Support

For issues or questions about the new architecture:
1. Check MongoDB connection strings in `.env`
2. Verify all three databases are accessible
3. Review server logs for connection errors
4. Ensure model getter functions are used in all routes
