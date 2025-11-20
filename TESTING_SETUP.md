# Test Setup and Execution Guide

## Quick Start

### 1. Install test dependencies
```powershell
cd server
npm install
```

### 2. Run tests
```powershell
npm test
```

### 3. Run tests with coverage
```powershell
npm run test:coverage
```

## What's Been Set Up

✅ **GitHub Actions Workflow** (`.github/workflows/ci.yml`)
   - Runs on push to main/develop branches
   - Runs on pull requests
   - Tests on Node.js 18.x and 20.x
   - Generates coverage reports

✅ **Jest Configuration** (`server/jest.config.js`)
   - Coverage thresholds set to 50%
   - Test timeout: 10 seconds
   - Verbose output enabled

✅ **Sample Tests** (`server/__tests__/`)
   - `sample.test.js` - Basic unit tests
   - `api.test.js` - API endpoint test templates

✅ **Updated package.json**
   - Added Jest and Supertest
   - Added test scripts

## Next Steps

1. **Install dependencies:**
   ```powershell
   cd server
   npm install
   ```

2. **Run the sample tests:**
   ```powershell
   npm test
   ```

3. **Write your own tests:**
   - Create files in `server/__tests__/` directory
   - Or create `*.test.js` files next to your source code

4. **Push to GitHub:**
   ```powershell
   git add .
   git commit -m "Add testing infrastructure and GitHub Actions"
   git push origin main
   ```

5. **Check GitHub Actions:**
   - Go to https://github.com/Trilokuday3/Algo_Verse/actions
   - You'll see your workflow running automatically!

## Test Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:verbose` | Run tests with detailed output |

## Coverage Report

After running `npm run test:coverage`, open:
```
server/coverage/lcov-report/index.html
```

## Documentation

See `docs/TESTING_GUIDE.md` for comprehensive testing documentation.
