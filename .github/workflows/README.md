# GitHub Actions CI/CD Workflows

## Preview CI/CD Workflow

**File:** `.github/workflows/preview-ci.yml`

### Overview

This workflow provides comprehensive CI/CD for the monorepo, including:
- ✅ Automatic detection of changed workers
- ✅ Lint and format checks
- ✅ Non-blocking Knip checks
- ✅ Test execution
- ✅ Preview deployments (only for changed workers)

### Trigger Conditions

The workflow runs on:
- **Pull Requests** to `main` branch
- **Manual trigger** via `workflow_dispatch`

### Workflow Jobs

#### 1. `detect-changes`
- Detects which worker folders have changes
- Outputs list of changed workers as JSON array for matrix strategy
- Skips workers with no changes

#### 2. `setup`
- Sets up Node.js 20
- Caches `node_modules` and `~/.npm`
- Installs dependencies with `npm ci`

#### 3. `lint`
- Runs `npm run lint` across all workspaces
- **Blocking** - must pass for deployment

#### 4. `format`
- Runs `npm run format:check` to verify formatting
- **Blocking** - must pass for deployment

#### 5. `knip`
- Runs Knip for workers that have it configured
- **Non-blocking** - warnings don't fail the workflow
- Uses `continue-on-error: true`

#### 6. `test`
- Runs tests for all workers with test scripts
- **Blocking** - must pass for deployment
- Gracefully skips if no tests found

#### 7. `deploy-preview` (Matrix Strategy)
- Deploys **only changed workers** to preview environment
- Uses matrix strategy for parallel deployments
- Each worker deploys independently
- Checks for `[env.preview]` in `wrangler.toml`
- Falls back to default deployment if no preview env

#### 8. `summary`
- Prints summary of all job results
- Shows changed workers and deployment status

### Required Secrets

Add these secrets in GitHub repository settings:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers edit permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

### Caching Strategy

The workflow caches:
- **Node modules:** `node_modules`, `**/node_modules`, `~/.npm`
- **Cache key:** `${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}`
- **Wrangler cache:** `.wrangler` directories per worker

### Example Output

```
✅ auth-worker has changes
⏭️  cart-worker has no changes, skipping
✅ order-worker has changes

Changed workers: auth-worker order-worker
```

### Deployment URLs

After successful deployment, preview URLs follow this pattern:
- `https://auth-worker-preview.aadhi18082003.workers.dev`
- `https://order-worker-preview.aadhi18082003.workers.dev`

### Best Practices

1. **Fast CI:** Jobs run in parallel where possible
2. **Efficient Caching:** Shared cache across jobs
3. **Selective Deployment:** Only changed workers deploy
4. **Early Failure:** Lint/format/test fail fast
5. **Non-blocking Knip:** Code quality checks don't block deployment

