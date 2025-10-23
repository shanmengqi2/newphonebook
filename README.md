# Deployment Documentation

## Table of Contents

1. [Project Structure](#project-structure)
2. [Local Development Setup](#local-development-setup)
3. [GitHub Actions CI/CD Pipeline](#github-actions-cicd-pipeline)
4. [Vercel Deployment Steps](#vercel-deployment-steps)
5. [Configuration Files](#configuration-files)
6. [Troubleshooting](#troubleshooting)
7. [Deployment Verification](#deployment-verification)

---

## Project Structure

This project uses a Monorepo architecture, managing both frontend and backend code in a single Git repository.

### Directory Structure

```
project-root/
├── .github/
│   └── workflow/
│       └── pipeline.yml          # GitHub Actions CI/CD configuration
├── phonebook_frontend/           # Frontend application (React + Vite)
│   ├── src/                      # Frontend source code
│   ├── package.json              # Frontend dependencies
│   ├── vite.config.js            # Vite build configuration
│   └── eslint.config.js          # Frontend ESLint configuration
├── phonebook_backend/            # Backend application (Node.js + Express)
│   ├── models/                   # Data models
│   ├── public/                   # Frontend build output directory
│   ├── index.js                  # Backend entry point
│   ├── package.json              # Backend dependencies
│   └── eslint.config.mjs         # Backend ESLint configuration
├── api/                          # Vercel serverless functions
│   └── index.js                  # Serverless function entry point
├── package.json                  # Root package.json (management scripts)
├── vercel.json                   # Vercel deployment configuration
└── README.md                     # This document
```

### Architecture Features

- **Separated but unified deployment**: Frontend build output goes to backend's `public` directory
- **Unified version control**: All code managed in a single Git repository
- **Automated CI/CD**: Automatic code checking and build verification via GitHub Actions
- **One-click deployment**: Integrated frontend and backend deployment through Vercel

---

## Local Development Setup

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- Git
- MongoDB database (local or cloud)

### Step 1: Clone Repository

```bash
git clone <your-repository-url>
cd <repository-name>
```

### Step 2: Install Dependencies

Use root directory management scripts to install all dependencies:

```bash
# Install all frontend and backend dependencies
npm run install:all

# Or install separately
npm run install:frontend  # Install frontend dependencies only
npm run install:backend   # Install backend dependencies only
```

### Step 3: Configure Environment Variables

Create a `.env` file in the `phonebook_backend` directory:

```bash
cd phonebook_backend
touch .env
```

Add the following configuration to the `.env` file:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
PORT=3001
```

**Note**:
- Replace `<username>`, `<password>`, `<cluster>`, and `<database>` with your MongoDB connection information
- Do not commit the `.env` file to Git repository (already configured in `.gitignore`)

### Step 4: Start Development Servers

#### Option 1: Start Frontend and Backend Simultaneously (Recommended for Development)

Run in two separate terminal windows:

```bash
# Terminal 1: Start backend development server
npm run dev:backend
# Backend will run at http://localhost:3001

# Terminal 2: Start frontend development server
npm run dev:frontend
# Frontend will run at http://localhost:5173
```

In development mode, the frontend communicates with the backend through Vite's proxy feature.

#### Option 2: Test Production Build

```bash
# 1. Build frontend
npm run build:frontend

# 2. Start backend (will also serve frontend static files)
npm run start:backend

# 3. Visit http://localhost:3001
```

### Step 5: Code Quality Check

Run ESLint to check code quality:

```bash
# Check all frontend and backend code
npm run lint

# Or check separately
npm run lint:frontend  # Check frontend only
npm run lint:backend   # Check backend only
```

---

## GitHub Actions CI/CD Pipeline

### Workflow Overview

This project uses GitHub Actions for automated Continuous Integration and Continuous Deployment (CI/CD). The workflow configuration file is located at `.github/workflow/pipeline.yml`.

### Trigger Conditions

The workflow automatically triggers in the following situations:

1. **Code push to main branch**
   ```bash
   git push origin main
   ```

2. **Create or update Pull Request to main branch**
   ```bash
   git push origin feature-branch
   # Then create PR on GitHub
   ```

### Workflow Process

#### Job 1: check_skip

Checks if the commit message contains the `#skip` marker.

- If commit message contains `#skip`, subsequent deployment processes are skipped
- Used for quick commits like documentation updates that don't require full CI/CD

**Usage example**:
```bash
git commit -m "Update README #skip"
git push origin main
```

#### Job 2: simple_deployment_pipeline

Executes complete code checking and build verification process.

**Step Details**:

1. **Checkout code** (`actions/checkout@v4`)
   - Pull latest code from GitHub repository

2. **Setup Node.js environment** (`actions/setup-node@v4`)
   - Install Node.js 20.x version
   - Ensure consistent build environment

3. **Cache dependencies** (`actions/cache@v4`)
   - Cache `node_modules` directory
   - Speed up subsequent builds (avoid re-downloading dependencies)

4. **Install frontend dependencies**
   ```bash
   cd phonebook_frontend && npm ci
   ```

5. **Check frontend code quality**
   ```bash
   cd phonebook_frontend && npm run lint
   ```
   - Workflow fails if ESLint errors are found

6. **Install backend dependencies**
   ```bash
   cd phonebook_backend && npm ci
   ```

7. **Check backend code quality**
   ```bash
   cd phonebook_backend && npx eslint .
   ```
   - Workflow fails if ESLint errors are found

8. **Build frontend**
   ```bash
   cd phonebook_frontend && npm run build
   ```
   - Build frontend code for production
   - Output to `phonebook_backend/public` directory

9. **Verify build artifacts**
   - Check if `phonebook_backend/public` directory exists
   - Check if `index.html` file is generated
   - Ensure build completed successfully

#### Job 3: tag_release

Automatically creates version tags after successful deployment to main branch.

- Only executes on push to main branch and when CI checks pass
- Automatically increments version number (default is patch version)
- Uses `anothrNick/github-tag-action` to create Git tags

### Execution Time

- Under normal circumstances, the complete CI/CD process should complete within **5 minutes**
- First run may take longer (no cache)

### View Workflow Status

1. Visit GitHub repository page
2. Click "Actions" tab at the top
3. View recent workflow run records
4. Click specific run record to view detailed logs

---

## Vercel Deployment Steps

### Prerequisites

1. Register Vercel account: https://vercel.com
2. Prepare MongoDB database connection string
3. Ensure GitHub repository is pushed to remote

### Step 1: Connect GitHub Repository

1. Log in to Vercel console
2. Click "Add New Project"
3. Select "Import Git Repository"
4. Authorize Vercel to access your GitHub account
5. Select the repository to deploy
6. Click "Import"

### Step 2: Configure Project Settings

Vercel will automatically detect the `vercel.json` configuration file, but you need to confirm the following settings:

#### Basic Settings

- **Framework Preset**: None (because we use custom configuration)
- **Root Directory**: `./` (project root directory)
- **Build Command**: Automatically read from `vercel.json`
- **Output Directory**: `phonebook_backend/public` (automatically read from `vercel.json`)

#### Environment Variables Configuration

Click "Environment Variables" and add the following variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority` | Production, Preview, Development |
| `PORT` | Leave empty (Vercel provides automatically) | - |

**Important Notes**:
- Ensure MongoDB URI is correct and database is accessible
- Do not hardcode sensitive information in code
- Environment variables need to be configured in all environments (Production, Preview, Development)

### Step 3: Trigger Deployment

#### Automatic Deployment

Vercel automatically triggers deployment in the following situations:

1. **Push to main branch**
   ```bash
   git push origin main
   ```
   - Triggers Production deployment
   - Deploys to production environment URL

2. **Push to other branches or create PR**
   ```bash
   git push origin feature-branch
   ```
   - Triggers Preview deployment
   - Generates preview URL for testing

#### Manual Deployment

In Vercel console:

1. Go to project page
2. Click "Deployments" tab
3. Click "Redeploy" button in upper right
4. Select version to redeploy

### Step 4: View Deployment Status

1. View deployment progress on Vercel console's "Deployments" page
2. Click specific deployment record to view detailed logs
3. After successful deployment, deployment URL will be displayed

### Deployment Process

Build process executed by Vercel (based on `vercel.json` configuration):

```bash
# 1. Install frontend dependencies and build
cd phonebook_frontend && npm install && npm run build

# 2. Install backend dependencies
cd ../phonebook_backend && npm install

# 3. Start backend server (automatic)
# Vercel automatically runs index.js as serverless function
```

### Get Deployment URL

After successful deployment, you'll get the following URLs:

- **Production URL**: `https://your-project.vercel.app`
- **Preview URL**: `https://your-project-<hash>.vercel.app`

---

## Configuration Files

### 1. vercel.json

Location: Project root directory

This is the core configuration file for Vercel deployment, defining build and deployment behavior.

```json
{
  "version": 2,
  "buildCommand": "cd phonebook_frontend && npm install && npm run build && cd ../phonebook_backend && npm install",
  "installCommand": "echo 'Dependencies installed in buildCommand'",
  "outputDirectory": "phonebook_backend/public",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api"
    },
    {
      "source": "/info",
      "destination": "/api"
    }
  ]
}
```

**Configuration Items**:

- **version**: Vercel configuration version (fixed at 2)
- **buildCommand**: Custom build command
  - First build frontend (output to `phonebook_backend/public`)
  - Then install backend dependencies
- **outputDirectory**: Static files directory for deployment
- **installCommand**: Disable default install command (handled in buildCommand)
- **rewrites**: Routing rewrite rules
  - `/api/*` requests forwarded to backend API serverless function
  - `/info` requests forwarded to backend API serverless function
  - Other requests served from static files (SPA)

### 2. .github/workflow/pipeline.yml

Location: `.github/workflow/pipeline.yml`

GitHub Actions workflow configuration file, defining CI/CD process.

**Main Configuration**:

```yaml
name: Deployment pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
    types: [opened, synchronize]
```

**Trigger Conditions**:
- Push to main branch
- Create or update PR to main branch

**Key Jobs**:

1. **check_skip**: Check if deployment should be skipped
2. **simple_deployment_pipeline**: Execute lint and build
3. **tag_release**: Automatically create version tags

**Environment Requirements**:
- Ubuntu latest version
- Node.js 20.x
- Use `npm ci` to install dependencies (ensure consistency)

### 3. Root package.json

Location: Project root directory

Provides unified management scripts to simplify monorepo operations.

```json
{
  "name": "phonebook-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "install:frontend": "cd phonebook_frontend && npm install",
    "install:backend": "cd phonebook_backend && npm install",
    "install:all": "npm run install:frontend && npm run install:backend",
    "lint:frontend": "cd phonebook_frontend && npm run lint",
    "lint:backend": "cd phonebook_backend && npx eslint .",
    "lint": "npm run lint:frontend && npm run lint:backend",
    "build:frontend": "cd phonebook_frontend && npm run build",
    "dev:frontend": "cd phonebook_frontend && npm run dev",
    "dev:backend": "cd phonebook_backend && npm run dev",
    "start:backend": "cd phonebook_backend && npm start"
  }
}
```

**Script Descriptions**:

| Script | Function | Use Case |
|--------|----------|----------|
| `install:all` | Install all dependencies | Initialize project |
| `lint` | Check all code | Pre-commit check |
| `build:frontend` | Build frontend | Prepare for deployment |
| `dev:frontend` | Start frontend dev server | Frontend development |
| `dev:backend` | Start backend dev server | Backend development |
| `start:backend` | Start production backend | Test production build |

### 4. phonebook_frontend/vite.config.js

Frontend build configuration, key settings:

```javascript
build: {
  outDir: '../phonebook_backend/public',
  emptyOutDir: true
}
```

- **outDir**: Build output to backend's public directory
- **emptyOutDir**: Empty target directory before build

### 5. phonebook_backend/index.js

Backend server configuration, key code:

```javascript
app.use(express.static('public'))
```

- Serves frontend static files
- All non-API requests return frontend application

### 6. api/index.js

Vercel serverless function entry point:

```javascript
// Import the Express app
const app = require('../phonebook_backend/index')

// Export for Vercel
module.exports = app
```

- Wraps Express app as Vercel serverless function
- Handles all API requests

---

## Troubleshooting

### 1. Build Failures

#### Issue: Frontend Build Fails

**Symptoms**:
```
Error: Build failed with errors
```

**Possible Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Dependencies not installed or version mismatch | Delete `node_modules` and `package-lock.json`, re-run `npm install` |
| ESLint errors | Run `npm run lint` to see specific errors, fix code issues |
| Out of memory | Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096 npm run build` |
| Vite configuration error | Check if `outDir` path in `vite.config.js` is correct |

**Debugging Steps**:

```bash
# 1. Clean and reinstall dependencies
cd phonebook_frontend
rm -rf node_modules package-lock.json
npm install

# 2. Check code quality
npm run lint

# 3. Try building
npm run build

# 4. Check output directory
ls -la ../phonebook_backend/public
```

#### Issue: Backend Dependency Installation Fails

**Symptoms**:
```
npm ERR! code ENOENT
```

**Solution**:

```bash
cd phonebook_backend
rm -rf node_modules package-lock.json
npm install
```

### 2. Deployment Failures

#### Issue: Vercel Deployment Timeout

**Symptoms**:
```
Error: Build exceeded maximum duration
```

**Possible Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Build time too long | Optimize dependencies, remove unnecessary packages |
| Network issues | Retrigger deployment |
| Vercel quota limit | Check Vercel account quota |

#### Issue: Vercel Cannot Find Build Artifacts

**Symptoms**:
```
Error: No output directory found
```

**Solution**:

1. Check `outputDirectory` setting in `vercel.json`
2. Ensure frontend build successfully generates files to `phonebook_backend/public`
3. Test build process locally:
   ```bash
   npm run build:frontend
   ls -la phonebook_backend/public
   ```

#### Issue: Environment Variables Not Configured

**Symptoms**:
```
Error: MONGODB_URI is not defined
```

**Solution**:

1. Log in to Vercel console
2. Go to Project Settings → Environment Variables
3. Add `MONGODB_URI` variable
4. Redeploy project

### 3. Frontend-Backend Communication Failures

#### Issue: Frontend Cannot Access Backend API

**Symptoms**:
- Browser console shows 404 errors
- Network requests fail

**Possible Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Incorrect API path | Ensure frontend requests use `/api/` prefix |
| CORS issues | Check if backend has correct CORS configuration (not needed in production) |
| Routing configuration error | Check `rewrites` configuration in `vercel.json` |
| Backend not started | Check Vercel deployment logs, confirm backend is running normally |

**Debugging Steps**:

```bash
# 1. Test API endpoint
curl https://your-app.vercel.app/api/persons

# 2. Check browser developer tools
# - Network tab: View request URL and response
# - Console tab: View error messages

# 3. Check frontend API call code
# Ensure using relative paths: /api/persons
```

#### Issue: CORS Error

**Symptoms**:
```
Access to fetch at 'http://...' has been blocked by CORS policy
```

**Solution**:

In production environment, frontend and backend are on the same domain, CORS issues should not occur. If they do:

1. Check if frontend is using absolute URLs (should use relative paths)
2. Ensure `rewrites` configuration in `vercel.json` is correct
3. Check if backend has additional CORS middleware configuration

### 4. GitHub Actions Failures

#### Issue: ESLint Check Fails

**Symptoms**:
```
Error: Command failed: npm run lint
```

**Solution**:

```bash
# 1. Run lint check locally
npm run lint

# 2. Fix all ESLint errors
# View specific error messages and fix

# 3. Auto-fix some issues (optional)
cd phonebook_frontend
npm run lint -- --fix

cd ../phonebook_backend
npx eslint . --fix

# 4. Commit fixed code
git add .
git commit -m "Fix ESLint errors"
git push
```

#### Issue: Cache Issues Causing Build Failures

**Symptoms**:
- Local build succeeds, but GitHub Actions fails
- Dependency version inconsistency

**Solution**:

1. Clear GitHub Actions cache:
   - Go to GitHub repository → Actions → Caches
   - Delete all caches
   - Retrigger workflow

2. Ensure using `npm ci` instead of `npm install` (already in configuration)

#### Issue: Workflow Unexpectedly Skipped

**Symptoms**:
- No CI/CD triggered after pushing code

**Check Items**:

1. Does commit message contain `#skip`
2. Is branch name correct (should be `main`)
3. Is GitHub Actions enabled

### 5. Database Connection Issues

#### Issue: Cannot Connect to MongoDB

**Symptoms**:
```
MongooseError: Could not connect to any servers
```

**Possible Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Incorrect connection string | Check `MONGODB_URI` format and credentials |
| IP whitelist restriction | Add `0.0.0.0/0` in MongoDB Atlas (allow all IPs) |
| Network timeout | Check MongoDB cluster status |
| Environment variable not set | Confirm `MONGODB_URI` is configured in Vercel |

**Debugging Steps**:

```bash
# 1. Test connection string (locally)
cd phonebook_backend
node mongo.js

# 2. Check MongoDB Atlas settings
# - Network Access: Ensure Vercel IPs are allowed
# - Database Access: Ensure user permissions are correct

# 3. Check Vercel environment variables
# Confirm MONGODB_URI is set in Vercel console
```

---

## Deployment Verification

### Local Verification

Before deploying to production environment, verify locally first:

#### 1. Verify Build Artifacts

```bash
# Build frontend
npm run build:frontend

# Check output directory
ls -la phonebook_backend/public

# Should see the following files:
# - index.html
# - assets/ (contains JS and CSS files)
# - vite.svg
```

#### 2. Verify Production Mode Running

```bash
# Start backend (will also serve frontend)
npm run start:backend

# Visit http://localhost:3001 in browser
```

#### 3. Functionality Test Checklist

- [ ] Page loads normally, no white screen
- [ ] Can view contact list
- [ ] Can add new contacts
- [ ] Can delete contacts
- [ ] Can search/filter contacts
- [ ] No errors in browser console
- [ ] Network requests normal (check Network tab)

### GitHub Actions Verification

#### 1. Check Workflow Status

1. Visit GitHub repository
2. Click "Actions" tab
3. View latest workflow run

**Success Indicators**:
- ✅ check_skip job completed
- ✅ simple_deployment_pipeline job completed
- ✅ All steps show green checkmarks
- ✅ tag_release job completed (if push to main)

#### 2. Check Build Logs

Click specific job to view detailed logs:

```
✓ Checkout code
✓ Setup Node.js
✓ Cache node modules
✓ Install frontend dependencies
✓ Lint frontend
✓ Install backend dependencies
✓ Lint backend
✓ Build frontend
✓ Verify build artifacts
```

#### 3. Verify Version Tags

```bash
# View Git tags
git fetch --tags
git tag

# Should see automatically created version tags, such as:
# v0.0.1
# v0.0.2
```

### Vercel Production Environment Verification

#### 1. Check Deployment Status

In Vercel console:

1. Go to project page
2. View "Deployments" tab
3. Confirm latest deployment status is "Ready"

**Success Indicators**:
- 🟢 Status shows "Ready"
- ⏱️ Build time reasonable (usually 5-10 minutes)
- 🔗 Deployment URL displayed

#### 2. Access Production URL

```bash
# Test with curl
curl https://your-app.vercel.app

# Should return HTML content (frontend application)

# Test API endpoint
curl https://your-app.vercel.app/api/persons

# Should return JSON data
```

#### 3. Browser Functionality Testing

Visit `https://your-app.vercel.app` and perform the following tests:

**Basic Functionality Tests**:
- [ ] Page loads normally, displays application interface
- [ ] Contact list displays normally
- [ ] Can add new contacts
- [ ] Can delete contacts
- [ ] Search/filter functionality works
- [ ] Form validation works properly

**Technical Verification**:
- [ ] Open browser developer tools → Console tab
  - No error messages
  - No warning messages
- [ ] Open Network tab
  - API request paths correct (`/api/persons`)
  - Response status code is 200
  - Response content correct
- [ ] Check page load performance
  - First load time < 3 seconds
  - Subsequent operations respond quickly

#### 4. End-to-End Test Scenarios

Execute complete user flow tests:

**Scenario 1: Add Contact**
1. Enter name and phone number in form
2. Click "Add" button
3. Verify contact appears in list
4. Refresh page, confirm data persisted

**Scenario 2: Delete Contact**
1. Click "Delete" button for a contact
2. Confirm contact removed from list
3. Refresh page, confirm deletion persisted

**Scenario 3: Search Contacts**
1. Enter keyword in search box
2. Verify list only shows matching contacts
3. Clear search box, verify all contacts displayed

**Scenario 4: Update Contact** (if implemented)
1. Try adding existing contact
2. Verify system prompts and updates phone number
3. Confirm update successful

#### 5. Performance and Availability Verification

```bash
# Test response time with curl
time curl https://your-app.vercel.app/api/persons

# Should return within 1-2 seconds

# Test multiple requests
for i in {1..5}; do
  curl -w "\nTime: %{time_total}s\n" https://your-app.vercel.app/api/persons
done
```

**Verification Checklist**:
- [ ] API response time < 2 seconds
- [ ] Page load time < 3 seconds
- [ ] No intermittent errors
- [ ] Database connection stable
- [ ] All features work in different browsers (Chrome, Firefox, Safari)

### Continuous Monitoring

After successful deployment, continuous monitoring is recommended:

#### 1. Vercel Analytics

View in Vercel console:
- Traffic statistics
- Response time
- Error rate
- Geographic distribution

#### 2. Log Monitoring

```bash
# View real-time logs in Vercel console
# Project → Deployments → [Select deployment] → Runtime Logs
```

Monitor the following logs:
- Database connection errors
- API request errors
- Uncaught exceptions

#### 3. Regular Health Checks

Set up regular checks (can use cron job or monitoring service):

```bash
#!/bin/bash
# health-check.sh

URL="https://your-app.vercel.app"

# Check homepage
if curl -f -s "$URL" > /dev/null; then
  echo "✓ Frontend is up"
else
  echo "✗ Frontend is down"
fi

# Check API
if curl -f -s "$URL/api/persons" > /dev/null; then
  echo "✓ API is up"
else
  echo "✗ API is down"
fi
```

---

## Summary

This document covers the complete process from local development to production deployment. Key points:

1. **Monorepo Structure**: Unified frontend and backend management, simplified version control
2. **Automated CI/CD**: GitHub Actions automatically checks code quality and builds
3. **One-Click Deployment**: Vercel automatically detects changes and deploys
4. **Configuration Files**: `vercel.json`, `pipeline.yml`, and root `package.json` work together
5. **Verification Testing**: Multi-level verification ensures successful deployment

If you have issues, please refer to the "Troubleshooting" section or check relevant logs for debugging.

---

**Document Version**: 1.0  
**Last Updated**: 2025.10.23  
**Maintainer**: SHAN MENGQI
