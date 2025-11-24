# Monorepo Structure - Complete File Contents (JavaScript)

This document contains the complete file structure and contents for the Hackathon-1 monorepo using **JavaScript** (not TypeScript).

## Root Level Files

### `package.json` (Root)

```json
{
	"name": "hackathon-1",
	"version": "1.0.0",
	"private": true,
	"type": "module",
	"description": "E-commerce monorepo with Cloudflare Workers",
	"workspaces": [
		"auth-worker",
		"cart-worker",
		"cart-cron-worker",
		"order-worker",
		"payment-worker",
		"fullfilment-worker",
		"price-worker",
		"product-worker"
	],
	"scripts": {
		"lint": "npm run lint --workspaces --if-present",
		"lint:fix": "npm run lint:fix --workspaces --if-present",
		"format": "npm run format --workspaces --if-present",
		"format:check": "npm run format:check --workspaces --if-present",
		"format:fix": "npm run format:fix --workspaces --if-present",
		"test": "npm run test --workspaces --if-present",
		"build": "npm run build --workspaces --if-present",
		"deploy": "npm run deploy --workspaces --if-present",
		"prepare": "husky"
	},
	"devDependencies": {
		"eslint": "^8.57.0",
		"eslint-config-prettier": "^9.1.0",
		"eslint-plugin-prettier": "^5.1.3",
		"husky": "^9.1.7",
		"prettier": "^3.2.4"
	},
	"engines": {
		"node": ">=20.0.0",
		"npm": ">=10.0.0"
	}
}
```

### `.eslintrc.json`

```json
{
	"root": true,
	"env": {
		"browser": false,
		"es2021": true,
		"node": true,
		"worker": true
	},
	"extends": ["eslint:recommended"],
	"parserOptions": {
		"ecmaVersion": "latest",
		"sourceType": "module"
	},
	"rules": {
		"no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
		"no-console": "off",
		"indent": ["error", "tab"],
		"linebreak-style": "off",
		"quotes": ["error", "single"],
		"semi": ["error", "always"]
	},
	"ignorePatterns": ["node_modules/", "dist/", ".wrangler/", "build/", "*.config.js", "*.config.cjs", "migrations/", "**/*.spec.js"]
}
```

### `.prettierrc`

```json
{
	"printWidth": 140,
	"tabWidth": 2,
	"useTabs": true,
	"semi": true,
	"singleQuote": true,
	"quoteProps": "as-needed",
	"trailingComma": "es5",
	"bracketSpacing": true,
	"arrowParens": "avoid",
	"endOfLine": "lf"
}
```

### `.gitignore`

```
# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json

# Build outputs
dist/
build/
.wrangler/
.wrangler.toml

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Logs
logs/
*.log

# Test coverage
coverage/
.nyc_output/

# Temporary files
*.tmp
*.temp
```

### `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run lint across all workspaces
echo "📦 Running lint..."
npm run lint -ws
LINT_EXIT_CODE=$?

# Run format check across all workspaces
echo "📦 Running format check..."
npm run format:check -ws
FORMAT_EXIT_CODE=$?

# Exit with error if any check failed
if [ $LINT_EXIT_CODE -ne 0 ] || [ $FORMAT_EXIT_CODE -ne 0 ]; then
	echo ""
	echo "❌ Pre-commit checks failed!"
	echo "   - Lint: $([ $LINT_EXIT_CODE -eq 0 ] && echo '✅' || echo '❌')"
	echo "   - Format: $([ $FORMAT_EXIT_CODE -eq 0 ] && echo '✅' || echo '❌')"
	echo ""
	echo "Please fix the errors above before committing."
	echo "You can run:"
	echo "  npm run lint:fix -ws    # Fix lint issues"
	echo "  npm run format:fix -ws  # Fix format issues"
	exit 1
fi

echo ""
echo "✅ All pre-commit checks passed!"
exit 0
```

## Worker Template Structure

Each worker should follow this structure. Here's an example for `cart-worker`:

### `cart-worker/package.json`

```json
{
	"name": "cart-worker",
	"version": "0.0.0",
	"private": true,
	"type": "module",
	"scripts": {
		"dev": "wrangler dev",
		"deploy": "wrangler deploy",
		"start": "wrangler dev",
		"lint": "eslint . --ext .js",
		"lint:fix": "eslint . --ext .js --fix",
		"format": "prettier --write \"**/*.{js,json,md}\"",
		"format:check": "prettier --check \"**/*.{js,json,md}\"",
		"format:fix": "prettier --write \"**/*.{js,json,md}\"",
		"test": "mocha test/**/*.spec.js",
		"test:unit": "mocha test/**/*.spec.js"
	},
	"devDependencies": {
		"@cloudflare/vitest-pool-workers": "^0.8.19",
		"chai": "^4.3.10",
		"eslint": "^8.57.0",
		"eslint-config-prettier": "^9.1.0",
		"eslint-plugin-prettier": "^5.1.3",
		"mocha": "^10.2.0",
		"prettier": "^3.2.4",
		"sinon": "^17.0.1",
		"vitest": "~3.2.0",
		"wrangler": "^4.46.0"
	},
	"dependencies": {
		"@microlabs/otel-cf-workers": "^1.0.0-rc.52",
		"@opentelemetry/api": "^1.9.0",
		"hono": "^4.10.6"
	}
}
```

### `cart-worker/wrangler.toml` (Template)

```toml
name = "cart-worker"
main = "src/index.js"
compatibility_date = "2025-11-07"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true

[[d1_databases]]
binding = "DB"
database_name = "cart-db"
database_id = "YOUR_DATABASE_ID"

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"

[[r2_buckets]]
binding = "LOGS"
bucket_name = "cart-worker-logs"

[[services]]
binding = "PRODUCTS_SERVICE"
service = "products-worker"

[[services]]
binding = "PRICE_SERVICE"
service = "price-worker"

[[services]]
binding = "FULFILLMENT_SERVICE"
service = "fullfilment-worker"

[[services]]
binding = "ORDER_SERVICE"
service = "order-worker"

[env.preview]
name = "cart-worker-preview"

[[env.preview.d1_databases]]
binding = "DB"
database_name = "cart-db"
database_id = "YOUR_DATABASE_ID"

[[env.preview.kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"

[[env.preview.r2_buckets]]
binding = "LOGS"
bucket_name = "cart-worker-logs"
```

### `cart-worker/src/index.js` (Template)

```javascript
/**
 * Cart Worker - Cloudflare Worker
 * Handles cart operations for the e-commerce platform
 */

import { Hono } from 'hono';

// Initialize Hono app
const app = new Hono();

// Health check endpoint
app.get('/health', c => {
	return c.json({
		status: 'ok',
		service: 'cart-worker',
		timestamp: new Date().toISOString(),
	});
});

// Add your routes here
// Example:
// app.post('/cart/add', addToCartHandler);
// app.get('/cart', getCartHandler);

// Export default handler
export default app;
```

### `cart-worker/.eslintrc.json` (Optional - inherits from root)

```json
{
	"extends": ["../../.eslintrc.json"]
}
```

## Complete Folder Structure

```
Hackathon-1/
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── package.json (root)
├── package-lock.json
├── .husky/
│   └── pre-commit
├── scripts/
│   └── update-worker-scripts.js
├── auth-worker/
│   ├── package.json
│   ├── wrangler.toml
│   ├── .eslintrc.json (optional)
│   └── src/
│       ├── index.js
│       ├── handlers/
│       ├── services/
│       ├── models/
│       ├── routes/
│       └── utils/
├── cart-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.js
│       └── ...
├── order-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.js
│       └── ...
├── product-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.js
│       └── ...
├── price-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.js
│       └── ...
├── fullfilment-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.js
│       └── ...
├── payment-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.js
│       └── ...
└── cart-cron-worker/
    ├── package.json
    ├── wrangler.toml
    └── src/
        ├── index.js
        └── ...
```

## Setup Instructions

1. **Install root dependencies:**

   ```bash
   npm install
   ```

2. **Update worker package.json files (adds scripts automatically):**

   ```bash
   node scripts/update-worker-scripts.js
   ```

3. **Install worker dependencies:**

   ```bash
   npm install -ws
   ```

4. **Initialize Husky:**

   ```bash
   npm run prepare
   ```

5. **Run checks manually:**

   ```bash
   npm run lint -ws
   npm run format:check -ws
   ```

6. **Fix issues:**
   ```bash
   npm run lint:fix -ws
   npm run format:fix -ws
   ```

## What the Pre-commit Hook Does

On every `git commit`, it automatically runs:

- `npm run lint -ws` (checks all workers for lint errors)
- `npm run format:check -ws` (checks formatting across all workers)

If any check fails, the commit is blocked.

## Notes

- **JavaScript Only**: This setup uses JavaScript (`.js` files), not TypeScript
- **Shared Config**: All workers share the same ESLint and Prettier configuration from the root
- **Pre-commit Hook**: Runs lint and format checks before allowing commits
- **Workspaces**: Allow running commands across all workers with `-ws` flag
- **Individual Dependencies**: Each worker can have its own dependencies while sharing dev tools
- **No TypeScript**: No `tsconfig.json` or TypeScript dependencies needed

## Worker Requirements

Each worker needs:

- `package.json` with `lint`, `lint:fix`, `format`, `format:check`, `format:fix` scripts
- `wrangler.toml` with `main = "src/index.js"`
- `src/index.js` (JavaScript entry point)
- Optional: `.eslintrc.json` that extends root config

Use the helper script to automatically add required scripts to all workers!
