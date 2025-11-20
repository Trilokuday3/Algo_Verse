# CI/CD Pipeline Setup Guide

## 🚀 Overview
This document describes the CI/CD pipeline setup for Alpha Z algo trading platform.

## 📋 Pipeline Structure

### 1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
Triggered on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Daily schedule at 2 AM UTC

**Jobs:**
- **Unit Tests**: Runs Jest tests with coverage
- **Integration Tests**: Full end-to-end testing
- **Health Check**: Verifies all endpoints
- **Deploy**: Deploys to AWS EC2 (main branch only)
- **Notify**: Alerts on failures

### 2. **Nightly Tests** (`.github/workflows/nightly-tests.yml`)
Triggered on:
- Daily schedule at 3 AM UTC
- Manual trigger via GitHub UI

**Purpose:**
- Comprehensive testing during low-traffic hours
- Long-running integration tests
- Performance benchmarking

## 🔧 Setup Instructions

### Step 1: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

```
EC2_SSH_KEY          # Your EC2 private key (ec2-key.pem content)
EC2_HOST             # 13.233.57.134
EC2_USER             # ubuntu
MONGODB_URI          # Your MongoDB connection string (optional)
```

### Step 2: Enable GitHub Actions

1. Go to repository Settings → Actions → General
2. Set "Actions permissions" to "Allow all actions and reusable workflows"
3. Enable "Read and write permissions" for GITHUB_TOKEN

### Step 3: Test the Pipeline

**Option A: Push to trigger automatically**
```bash
git add .
git commit -m "Setup CI/CD pipeline"
git push origin main
```

**Option B: Manual trigger**
1. Go to Actions tab in GitHub
2. Select "Nightly Tests" workflow
3. Click "Run workflow"

## 📊 Test Coverage

### Unit Tests (Jest)
- Location: `server/__tests__/`
- Coverage target: >80%
- Reports uploaded to Codecov

### Integration Tests
1. **test-cloud-deployment.js**: Core API endpoints
2. **test-integration.js**: Complete user flows
3. **test-features.js**: Feature-specific tests
4. **test-endpoint-health.js**: Endpoint health monitoring

## 🔄 Deployment Process

### Automatic Deployment (Main Branch)
```
1. Code pushed to main
2. Unit tests run
3. Integration tests run
4. Health checks pass
5. Deploy to AWS EC2
   - Upload server files
   - Upload client files
   - Install dependencies
   - Restart PM2 server
6. Post-deployment health check
7. Notify if any step fails
```

### Manual Deployment
```bash
# From local machine
scp -i "ec2-key.pem" -r server/* ubuntu@13.233.57.134:/home/ubuntu/Algo_Verse/server/
scp -i "ec2-key.pem" -r client/* ubuntu@13.233.57.134:/home/ubuntu/Algo_Verse/client/
ssh -i "ec2-key.pem" ubuntu@13.233.57.134 "pm2 restart algo-server"
```

## 📈 Monitoring & Alerts

### View Test Results
1. Go to GitHub Actions tab
2. Click on latest workflow run
3. View job logs and artifacts

### Download Test Reports
```bash
gh run download <run-id> -n integration-test-results
```

### Setup Notifications (Optional)

**Slack Integration:**
```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Email Notifications:**
```yaml
- name: Send Email
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: CI/CD Pipeline Failed
    body: Check GitHub Actions for details
    to: your-email@example.com
```

## 🛠️ Local Testing (Before Push)

### Run all tests locally:
```bash
# Unit tests
cd server && npm test

# Cloud deployment tests
node test-cloud-deployment.js

# Integration tests
node test-integration.js

# Feature tests
node test-features.js

# Endpoint health
node test-endpoint-health.js
```

### Run with coverage:
```bash
cd server && npm test -- --coverage
```

## 🔒 Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets
2. **Rotate SSH keys** regularly
3. **Use read-only tokens** where possible
4. **Enable branch protection** on main
5. **Require status checks** before merging

## 📝 Workflow Badges

Add to README.md:
```markdown
![CI/CD Pipeline](https://github.com/Trilokuday3/Algo_Verse/workflows/CI%2FCD%20Pipeline%20-%20Alpha%20Z/badge.svg)
![Nightly Tests](https://github.com/Trilokuday3/Algo_Verse/workflows/Nightly%20Tests/badge.svg)
```

## 🚨 Troubleshooting

### Tests failing in CI but passing locally?
- Check environment variables
- Verify Node.js version matches (18)
- Check MongoDB connection string

### Deployment failures?
- Verify EC2_SSH_KEY secret is correct
- Check EC2 security groups allow SSH (port 22)
- Ensure PM2 is installed on EC2

### Slow test execution?
- Increase timeout in test files
- Use `continue-on-error: true` for non-critical tests
- Split into parallel jobs

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Testing Framework](https://jestjs.io/)
- [PM2 Process Manager](https://pm2.keymetrics.io/)
- [AWS EC2 Deployment Guide](https://docs.aws.amazon.com/ec2/)

## 🎯 Next Steps

1. ✅ Setup GitHub Secrets
2. ✅ Enable GitHub Actions
3. ✅ Push code to trigger first run
4. ✅ Monitor test results
5. ✅ Configure notifications (optional)
6. ✅ Add status badges to README
7. ✅ Setup branch protection rules
