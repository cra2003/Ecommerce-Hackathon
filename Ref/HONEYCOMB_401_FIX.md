# Fixing Honeycomb 401 Error

If you're seeing `OTLPExporterError: Exporter received a statusCode: 401`, this means Honeycomb is rejecting your API key.

## The Problem

Your API key is being sent (length: 32), but Honeycomb is returning 401 Unauthorized. This typically means:

1. **Invalid API Key** - The key doesn't exist or has been revoked
2. **Wrong API Key Type** - Using a read-only key instead of write key
3. **Expired Key** - The key has expired
4. **Wrong Team** - Using an API key from a different Honeycomb team

## How to Fix

### Step 1: Verify Your API Key in Honeycomb

1. Go to [Honeycomb Settings → API Keys](https://ui.honeycomb.io/settings/api-keys)
2. Find your API key (or create a new one)
3. Make sure it has:
   - ✅ **Write** permissions (not just Read)
   - ✅ **Active** status (not revoked)
   - ✅ **Correct team** (matches your Honeycomb account)

### Step 2: Get the Correct API Key

Honeycomb API keys should:

- Be longer than 32 characters (usually 32-64 chars)
- Start with your team identifier
- Have write permissions

**To create a new API key:**

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name it (e.g., "OpenTelemetry Workers")
4. Select **Write** permissions
5. Copy the key immediately (you won't see it again)

### Step 3: Update the Secret

```bash
cd cart-worker
wrangler secret put OTEL_INGEST_API_KEY
# Paste the FULL API key (no spaces, no newlines)
```

**Important:**

- Copy the entire key
- Don't add any spaces or newlines
- The key should be one continuous string

### Step 4: Verify Key Length

After updating, check the logs:

```bash
wrangler tail | grep "API key present"
```

You should see something like:

```
[OTEL] API key present: Yes (length: 48)
```

If the length is still 32, the key might be truncated or wrong.

### Step 5: Test with curl (Optional)

You can test your API key directly:

```bash
# Replace YOUR_API_KEY with your actual key
curl -X POST https://api.honeycomb.io/v1/traces \
  -H "X-Honeycomb-Team: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'
```

If you get 401, the key is invalid.
If you get 200 or 400 (bad request), the key is valid.

### Step 6: Check for Multiple Keys

If you have multiple API keys:

- Make sure you're using the **Write** key
- Not a **Read** key
- Not a **Classic** key (use OTLP keys)

### Step 7: Redeploy

After updating the secret:

```bash
cd cart-worker
npm run deploy
```

## Common Mistakes

1. **Using Read Key** - Read keys can't write traces → Use Write key
2. **Truncated Key** - Key got cut off during copy → Copy entire key
3. **Extra Spaces** - Added spaces when pasting → Code now trims automatically
4. **Wrong Team** - Using key from different team → Use key from your team
5. **Expired Key** - Key was revoked → Create new key

## Verification

After fixing, you should see in logs:

```
[OTEL] Tracing enabled for cart-worker
[OTEL] Endpoint: https://api.honeycomb.io/v1/traces
[OTEL] API key present: Yes (length: XX)
[OTEL] Honeycomb headers: { 'X-Honeycomb-Team': '***XXXX', 'X-Honeycomb-Dataset': '(default)' }
```

And **NO** 401 errors when exporting spans.

## Still Getting 401?

1. **Double-check the API key** in Honeycomb dashboard
2. **Create a fresh API key** with Write permissions
3. **Verify the key works** with the curl test above
4. **Check Honeycomb status** - Make sure their API is operational
5. **Contact Honeycomb support** if the key is definitely correct
