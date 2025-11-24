# Preview Environment Setup Guide

This guide explains how to set up secrets for the preview environment in Cloudflare Workers.

## Overview

Preview environments are separate deployments that allow you to test changes before merging to production. Each worker can have its own preview environment with separate secrets.

## Required Secrets by Worker

### 🔐 auth-worker

**Required Secrets:**

- `JWT_SECRET` - Secret key for signing/verifying JWT tokens
- `AUTH_ENC_KEY` - Encryption key for sensitive data (emails, phones, addresses)

**Optional:**

- `OTEL_INGEST_API_KEY` - OpenTelemetry API key (for tracing)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry endpoint (optional)
- `OTEL_DATASET` - OpenTelemetry dataset name (optional)

### 🛒 cart-worker

**Required Secrets:**

- `JWT_SECRET` - For verifying JWT tokens from auth-worker

**Optional:**

- `OTEL_INGEST_API_KEY` - OpenTelemetry API key
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry endpoint
- `OTEL_DATASET` - OpenTelemetry dataset name

### 📦 order-worker

**Required Secrets:**

- `JWT_SECRET` - For verifying JWT tokens from auth-worker

**Optional:**

- `OTEL_INGEST_API_KEY` - OpenTelemetry API key
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry endpoint
- `OTEL_DATASET` - OpenTelemetry dataset name

### 💳 payment-worker

**Required Secrets:**

- `PAYPAL_CLIENT_ID` - PayPal Sandbox client ID
- `PAYPAL_CLIENT_SECRET` - PayPal Sandbox client secret

**Optional:**

- `PAYPAL_API_BASE` - PayPal API base URL (defaults to sandbox)
- `OTEL_INGEST_API_KEY` - OpenTelemetry API key
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry endpoint
- `OTEL_DATASET` - OpenTelemetry dataset name

### 📊 Other Workers (product, price, fulfillment)

**Optional:**

- `OTEL_INGEST_API_KEY` - OpenTelemetry API key
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry endpoint
- `OTEL_DATASET` - OpenTelemetry dataset name

---

## Setting Up Preview Environment Secrets

### Method 1: Using Wrangler CLI (Recommended)

#### Step 1: Set Secrets for auth-worker Preview

```bash
cd auth-worker

# Set JWT_SECRET for preview environment
wrangler secret put JWT_SECRET --env preview

# Set AUTH_ENC_KEY for preview environment
wrangler secret put AUTH_ENC_KEY --env preview

# Optional: Set OpenTelemetry secrets
wrangler secret put OTEL_INGEST_API_KEY --env preview
```

**When prompted, enter the secret value:**

- For `JWT_SECRET`: Use a strong random string (e.g., generate with `openssl rand -hex 32`)
- For `AUTH_ENC_KEY`: Use a 32-byte key (e.g., `openssl rand -hex 32`)
- For `OTEL_INGEST_API_KEY`: Your Honeycomb API key

#### Step 2: Set Secrets for cart-worker Preview

```bash
cd cart-worker

# Set JWT_SECRET (must match auth-worker's JWT_SECRET!)
wrangler secret put JWT_SECRET --env preview

# Optional: OpenTelemetry
wrangler secret put OTEL_INGEST_API_KEY --env preview
```

**⚠️ Important:** `JWT_SECRET` must be the **same** across `auth-worker`, `cart-worker`, and `order-worker` so tokens can be verified.

#### Step 3: Set Secrets for order-worker Preview

```bash
cd order-worker

# Set JWT_SECRET (must match auth-worker's JWT_SECRET!)
wrangler secret put JWT_SECRET --env preview

# Optional: OpenTelemetry
wrangler secret put OTEL_INGEST_API_KEY --env preview
```

#### Step 4: Set Secrets for payment-worker Preview

```bash
cd payment-worker

# Set PayPal Sandbox credentials
wrangler secret put PAYPAL_CLIENT_ID --env preview
wrangler secret put PAYPAL_CLIENT_SECRET --env preview

# Optional: Set custom PayPal API base (if not using sandbox)
wrangler secret put PAYPAL_API_BASE --env preview

# Optional: OpenTelemetry
wrangler secret put OTEL_INGEST_API_KEY --env preview
```

#### Step 5: Set Secrets for Other Workers (Optional)

```bash
# For product-worker, price-worker, fullfilment-worker
cd product-worker  # or price-worker, fullfilment-worker
wrangler secret put OTEL_INGEST_API_KEY --env preview
```

---

### Method 2: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Select your worker (e.g., `auth-worker-preview`)
4. Go to **Settings** → **Variables and Secrets**
5. Click **Add Secret** for each secret
6. Enter the secret name and value
7. Click **Save**

---

## Quick Setup Script

Create a script to set all preview secrets at once:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up preview environment secrets...${NC}\n"

# Generate secrets (you can also use existing production secrets)
JWT_SECRET=$(openssl rand -hex 32)
AUTH_ENC_KEY=$(openssl rand -hex 32)

echo -e "${YELLOW}Generated JWT_SECRET: ${JWT_SECRET}${NC}"
echo -e "${YELLOW}Generated AUTH_ENC_KEY: ${AUTH_ENC_KEY}${NC}\n"

# auth-worker
echo "Setting secrets for auth-worker..."
cd auth-worker
echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env preview
echo "$AUTH_ENC_KEY" | wrangler secret put AUTH_ENC_KEY --env preview
cd ..

# cart-worker
echo "Setting secrets for cart-worker..."
cd cart-worker
echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env preview
cd ..

# order-worker
echo "Setting secrets for order-worker..."
cd order-worker
echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env preview
cd ..

# payment-worker
echo "Setting secrets for payment-worker..."
cd payment-worker
echo "Enter PayPal Client ID:"
read PAYPAL_CLIENT_ID
echo "Enter PayPal Client Secret:"
read PAYPAL_CLIENT_SECRET
echo "$PAYPAL_CLIENT_ID" | wrangler secret put PAYPAL_CLIENT_ID --env preview
echo "$PAYPAL_CLIENT_SECRET" | wrangler secret put PAYPAL_CLIENT_SECRET --env preview
cd ..

echo -e "\n${GREEN}✅ Preview secrets setup complete!${NC}"
```

---

## Verifying Secrets

### Check if secrets are set:

```bash
# For auth-worker
cd auth-worker
wrangler secret list --env preview

# Should show:
# JWT_SECRET
# AUTH_ENC_KEY
```

### Test the preview deployment:

```bash
# Deploy to preview
cd auth-worker
wrangler deploy --env preview

# Check health endpoint
curl https://auth-worker-preview.aadhi18082003.workers.dev/health
```

The health endpoint should show:

```json
{
	"status": "ok",
	"secrets": {
		"JWT_SECRET": true,
		"AUTH_ENC_KEY": true
	}
}
```

---

## Secret Management Best Practices

### 1. **Use Different Secrets for Preview vs Production**

- ✅ **Preview:** Use test/sandbox credentials
- ✅ **Production:** Use real credentials
- ✅ **JWT_SECRET:** Can be the same or different (recommend different for security)

### 2. **JWT_SECRET Must Match Across Workers**

For preview environment:

- `auth-worker` signs tokens with `JWT_SECRET`
- `cart-worker` verifies tokens with `JWT_SECRET`
- `order-worker` verifies tokens with `JWT_SECRET`

**All three must use the same `JWT_SECRET` value!**

### 3. **PayPal Sandbox for Preview**

- Use PayPal Sandbox credentials for preview
- Use real PayPal credentials for production
- Set `PAYPAL_API_BASE` to sandbox URL for preview

### 4. **OpenTelemetry (Optional)**

- Can use the same API key for preview and production
- Or use separate datasets: `preview-dataset` vs `production-dataset`

---

## Example: Complete Preview Setup

```bash
# 1. Generate shared secrets
JWT_SECRET=$(openssl rand -hex 32)
AUTH_ENC_KEY=$(openssl rand -hex 32)

# 2. Set auth-worker secrets
cd auth-worker
echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env preview
echo "$AUTH_ENC_KEY" | wrangler secret put AUTH_ENC_KEY --env preview
cd ..

# 3. Set cart-worker secrets (same JWT_SECRET!)
cd cart-worker
echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env preview
cd ..

# 4. Set order-worker secrets (same JWT_SECRET!)
cd order-worker
echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env preview
cd ..

# 5. Set payment-worker secrets (PayPal Sandbox)
cd payment-worker
# Enter your PayPal Sandbox credentials when prompted
wrangler secret put PAYPAL_CLIENT_ID --env preview
wrangler secret put PAYPAL_CLIENT_SECRET --env preview
cd ..

# 6. Optional: Set OpenTelemetry for all workers
for worker in auth-worker cart-worker order-worker payment-worker product-worker price-worker fullfilment-worker; do
  cd "$worker"
  echo "YOUR_HONEYCOMB_API_KEY" | wrangler secret put OTEL_INGEST_API_KEY --env preview
  cd ..
done
```

---

## Troubleshooting

### Secret Not Found Error

If you see `JWT_SECRET is not defined`:

1. Verify secret is set:

   ```bash
   wrangler secret list --env preview
   ```

2. Re-set the secret:
   ```bash
   wrangler secret put JWT_SECRET --env preview
   ```

### Token Verification Fails

If tokens from `auth-worker` are rejected by `cart-worker` or `order-worker`:

1. **Check JWT_SECRET matches:**

   ```bash
   # All three workers must have the same JWT_SECRET
   cd auth-worker && wrangler secret list --env preview | grep JWT_SECRET
   cd ../cart-worker && wrangler secret list --env preview | grep JWT_SECRET
   cd ../order-worker && wrangler secret list --env preview | grep JWT_SECRET
   ```

2. **Redeploy workers after setting secrets:**
   ```bash
   wrangler deploy --env preview
   ```

### PayPal Payment Fails in Preview

1. Verify PayPal Sandbox credentials:

   ```bash
   cd payment-worker
   wrangler secret list --env preview | grep PAYPAL
   ```

2. Ensure you're using Sandbox credentials, not production

---

## Summary

✅ **Yes, you need JWT secrets in preview environment!**

- `JWT_SECRET` is required for `auth-worker`, `cart-worker`, and `order-worker`
- All three must use the **same** `JWT_SECRET` value
- `AUTH_ENC_KEY` is required for `auth-worker` only
- PayPal credentials are required for `payment-worker`
- OpenTelemetry secrets are optional but recommended

Use the Wrangler CLI commands above to set secrets for each worker's preview environment.
