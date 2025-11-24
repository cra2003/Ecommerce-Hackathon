# OpenTelemetry Troubleshooting Guide

If you can only see `products-worker` in Honeycomb but not other workers, follow these steps:

## Step 1: Verify Secrets Are Set

Check if secrets are actually set for each worker:

```bash
# Check secrets for each worker
cd price-worker && wrangler secret list && cd ..
cd cart-worker && wrangler secret list && cd ..
cd payment-worker && wrangler secret list && cd ..
cd fullfilment-worker && wrangler secret list && cd ..
cd auth-worker && wrangler secret list && cd ..
```

You should see `OTEL_INGEST_API_KEY` listed for each worker.

## Step 2: Check Worker Logs

Tail the logs for each worker to see if tracing is enabled:

```bash
# Tail logs for each worker
cd price-worker && wrangler tail --format pretty | grep OTEL
cd cart-worker && wrangler tail --format pretty | grep OTEL
cd payment-worker && wrangler tail --format pretty | grep OTEL
cd fullfilment-worker && wrangler tail --format pretty | grep OTEL
cd auth-worker && wrangler tail --format pretty | grep OTEL
```

Look for:
- `[OTEL] Tracing enabled for <worker-name>` - ✅ Tracing is working
- `[OTEL] OTEL_INGEST_API_KEY not found` - ❌ Secret is missing

## Step 3: Verify Workers Are Receiving Traffic

Traces only appear when workers receive requests. Make sure you're:

1. **Making actual API calls** to each worker
2. **Not just checking health endpoints** (health checks might not generate traces)
3. **Waiting a few minutes** for traces to appear in Honeycomb

## Step 4: Test Each Worker Individually

Test each worker to generate traces:

```bash
# Test price-worker
curl https://price-worker.aadhi18082003.workers.dev/api/price/P0001

# Test cart-worker
curl https://cart-worker.aadhi18082003.workers.dev/cart

# Test payment-worker
curl https://payment-worker.aadhi18082003.workers.dev/health

# Test fullfilment-worker
curl https://fullfilment-worker.aadhi18082003.workers.dev/health

# Test auth-worker
curl https://auth-worker.aadhi18082003.workers.dev/health
```

## Step 5: Re-add Secrets (If Missing)

If secrets are missing, add them again:

```bash
# For each worker
cd price-worker
wrangler secret put OTEL_INGEST_API_KEY
# Paste your API key when prompted
cd ..

# Repeat for other workers...
```

## Step 6: Redeploy After Adding Secrets

**Important:** After adding secrets, you MUST redeploy:

```bash
cd price-worker && npm run deploy && cd ..
cd cart-worker && npm run deploy && cd ..
cd payment-worker && npm run deploy && cd ..
cd fullfilment-worker && npm run deploy && cd ..
cd auth-worker && npm run deploy && cd ..
```

## Step 7: Check Honeycomb Dataset

In Honeycomb:

1. Go to your dataset
2. Check the **Service** field in the trace view
3. Filter by `service.name` to see all services
4. Make sure you're looking at the right time range (last hour, last day, etc.)

## Step 8: Verify API Key Permissions

Make sure your Honeycomb API key has:
- ✅ **Write** permissions
- ✅ Access to the correct dataset
- ✅ Not expired

## Common Issues

### Issue: Only one worker shows up

**Possible causes:**
1. Secrets not set for other workers
2. Workers not receiving traffic
3. Workers not redeployed after adding secrets
4. API key doesn't have write permissions

**Solution:** Follow steps 1-6 above

### Issue: No traces at all

**Possible causes:**
1. API key is invalid
2. Endpoint URL is wrong
3. Network issues

**Solution:**
- Verify API key in Honeycomb dashboard
- Check worker logs for errors
- Test with `curl` to see if workers respond

### Issue: Traces appear but service name is wrong

**Solution:** Check the `service.name` in each worker's `index.js` - it should match the worker name.

## Quick Diagnostic Script

Run this to check all workers at once:

```bash
#!/bin/bash

WORKERS=("price-worker" "cart-worker" "payment-worker" "fullfilment-worker" "auth-worker" "product-worker")

for worker in "${WORKERS[@]}"; do
  echo "=== Checking $worker ==="
  cd "$worker"
  
  # Check if secret exists
  if wrangler secret list | grep -q "OTEL_INGEST_API_KEY"; then
    echo "✅ Secret found"
  else
    echo "❌ Secret NOT found - run: wrangler secret put OTEL_INGEST_API_KEY"
  fi
  
  # Check if deployed
  echo "Checking deployment status..."
  wrangler deployments list | head -5
  
  cd ..
  echo ""
done
```

## Still Not Working?

1. **Check Honeycomb quotas** - Make sure you haven't hit rate limits
2. **Check worker errors** - Use `wrangler tail` to see runtime errors
3. **Verify endpoint** - Make sure endpoint URL is correct
4. **Check service names** - Ensure service names match in Honeycomb

## Expected Behavior

After setup, you should see:
- ✅ All 6 workers in Honeycomb service list
- ✅ Traces appearing within 1-2 minutes of requests
- ✅ Service names matching worker names
- ✅ Distributed traces showing service-to-service calls

