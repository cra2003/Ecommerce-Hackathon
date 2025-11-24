# OpenTelemetry Tracing Setup

This worker is configured with OpenTelemetry tracing using `@microlabs/otel-cf-workers`.

## Setting Up the Ingest API Key

You need to add the following secrets to your Cloudflare Worker:

### Required Secrets

1. **OTEL_INGEST_API_KEY** - Your OpenTelemetry ingest API key
2. **OTEL_EXPORTER_OTLP_ENDPOINT** (optional) - Your OTLP endpoint URL

### How to Add Secrets

#### Option 1: Using Wrangler CLI

```bash
cd product-worker

# Add the ingest API key
wrangler secret put OTEL_INGEST_API_KEY

# Add the endpoint (optional, defaults to Honeycomb)
wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT
```

When prompted, paste your API key/endpoint.

#### Option 2: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **products-worker**
3. Go to **Settings** → **Variables and Secrets**
4. Under **Secrets**, click **Add secret**
5. Add:
   - Name: `OTEL_INGEST_API_KEY`
   - Value: Your ingest API key
6. (Optional) Add:
   - Name: `OTEL_EXPORTER_OTLP_ENDPOINT`
   - Value: Your OTLP endpoint URL

### Provider-Specific Endpoints

The worker supports different OpenTelemetry providers:

#### Honeycomb (Default)

- Endpoint: `https://api.honeycomb.io/v1/traces`
- Header: `X-Honeycomb-Team` (contains API key)
- Set only `OTEL_INGEST_API_KEY`

#### Grafana Cloud

- Endpoint: `https://otlp-gateway-<region>.grafana.net/otlp`
- Header: `Authorization: Basic <base64-encoded-api-key>`
- Set both:
  - `OTEL_INGEST_API_KEY` = Your Grafana API key
  - `OTEL_EXPORTER_OTLP_ENDPOINT` = Your Grafana OTLP endpoint

#### Generic OTLP Endpoint

- Header: `Authorization: Bearer <api-key>`
- Set both:
  - `OTEL_INGEST_API_KEY` = Your API key
  - `OTEL_EXPORTER_OTLP_ENDPOINT` = Your OTLP endpoint URL

### Verification

After adding the secrets, deploy the worker:

```bash
npm run deploy
```

Traces should start appearing in your observability platform within a few minutes.

## What Gets Traced

The instrumentation automatically traces:

- All HTTP requests and responses
- Fetch calls (if enabled)
- Service name: `products-worker`
- Service version: `1.0.0`

## Local Development

For local development, you can set environment variables in `.dev.vars`:

```bash
OTEL_INGEST_API_KEY=your-api-key-here
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
```

**Note:** Don't commit `.dev.vars` to git (it's already in `.gitignore`).
