# GitHub Actions CI/CD Status

## Build Status

![CI/CD Pipeline](https://github.com/Trilokuday3/Algo_Verse/workflows/CI%2FCD%20Pipeline/badge.svg)

## Workflow Overview

The CI/CD pipeline automatically runs on:
- ✅ Push to `main` branch
- ✅ Push to `develop` branch  
- ✅ Pull requests to `main` or `develop`

## Jobs

### 1. Test Server
- Tests on Node.js 18.x and 20.x
- Runs Jest test suites
- Generates coverage reports

### 2. Test Client
- Validates HTML files
- Runs client-side tests (if configured)

### 3. Build
- Verifies build process
- Uploads test artifacts

### 4. Code Quality
- Checks code formatting with Prettier
- Runs linting (if configured)

## Viewing Results

1. Go to [Actions Tab](https://github.com/Trilokuday3/Algo_Verse/actions)
2. Click on any workflow run
3. View detailed logs for each job
4. Download artifacts (coverage reports, test results)

## Test Coverage

Coverage reports are uploaded as artifacts and can be downloaded from the workflow run page.

## Adding the Badge to README

Add this line to your main README.md:

\`\`\`markdown
![CI/CD](https://github.com/Trilokuday3/Algo_Verse/workflows/CI%2FCD%20Pipeline/badge.svg)
\`\`\`

## Local Testing

Before pushing, you can run tests locally:

\`\`\`bash
cd server
npm test
\`\`\`

This ensures your changes pass all tests before triggering the CI pipeline.
