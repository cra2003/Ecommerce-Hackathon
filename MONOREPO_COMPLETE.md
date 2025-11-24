# Complete Monorepo Structure - JavaScript Cloudflare Workers

This document contains the **complete file structure and contents** for the Hackathon-1 monorepo following modern best practices.

## 📁 Folder Tree

```
Hackathon-1/
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── .husky/
│   └── pre-commit
├── package.json
├── scripts/
│   └── setup-workers.js
├── auth-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       └── index.js
├── cart-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       └── index.js
├── cart-cron-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       └── index.js
├── order-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       └── index.js
├── payment-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       └── index.js
├── fullfilment-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       └── index.js
├── price-worker/
│   ├── package.json
│   ├── wrangler.toml
│   └── src/
│       └── index.js
└── product-worker/
    ├── package.json
    ├── wrangler.toml
    └── src/
        └── index.js
```

---

## 📄 Root Level Files

### `package.json` (Root)

```json
{
	"name": "hackathon-1",
	"version": "1.0.0",
	"private": true,
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
		"lint": "npm run lint -ws",
		"format": "npm run format -ws",
		"prepare": "husky"
	},
	"devDependencies": {
		"eslint": "^8.57.0",
		"eslint-config-prettier": "^9.1.0",
		"eslint-plugin-prettier": "^5.1.3",
		"prettier": "^3.2.4",
		"wrangler": "^4.46.0",
		"husky": "^9.1.7"
	}
}
```

**Key Points:**

- ✅ `"private": true` - Prevents accidental publishing
- ✅ All devDependencies at root only (no duplication)
- ✅ `wrangler` included for deployment
- ✅ Only `lint` and `format` scripts (simple and clean)

---

### `.eslintrc.cjs` (Shared ESLint Config)

```javascript
module.exports = {
	root: true,
	env: {
		browser: false,
		es2021: true,
		node: true,
		worker: true,
	},
	extends: ['eslint:recommended', 'plugin:prettier/recommended'],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	plugins: ['prettier'],
	rules: {
		'no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
			},
		],
		'no-console': 'off',
		'prettier/prettier': 'error',
	},
	ignorePatterns: ['node_modules/', 'dist/', '.wrangler/', 'build/', '*.config.js', '*.config.cjs', 'migrations/', '**/*.spec.js'],
};
```

**Key Points:**

- ✅ Shared config for all workers
- ✅ Integrates Prettier with ESLint
- ✅ Allows unused vars prefixed with `_`
- ✅ Ignores test files and config files

---

### `.prettierrc` (Shared Prettier Config)

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

**Key Points:**

- ✅ Consistent formatting across all workers
- ✅ Uses tabs for indentation
- ✅ Single quotes
- ✅ Semicolons required

---

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

---

### `.husky/pre-commit` (Pre-commit Hook)

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run lint
echo "📦 Running lint..."
npm run lint
LINT_EXIT_CODE=$?

# Run format
echo "📦 Running format..."
npm run format
FORMAT_EXIT_CODE=$?

# Exit with error if any check failed
if [ $LINT_EXIT_CODE -ne 0 ] || [ $FORMAT_EXIT_CODE -ne 0 ]; then
	echo ""
	echo "❌ Pre-commit checks failed!"
	echo "   - Lint: $([ $LINT_EXIT_CODE -eq 0 ] && echo '✅' || echo '❌')"
	echo "   - Format: $([ $FORMAT_EXIT_CODE -eq 0 ] && echo '✅' || echo '❌')"
	echo ""
	echo "Please fix the errors above before committing."
	exit 1
fi

echo ""
echo "✅ All pre-commit checks passed!"
exit 0
```

**Key Points:**

- ✅ Runs `npm run lint` (which runs across all workspaces)
- ✅ Runs `npm run format` (which formats all workspaces)
- ✅ Blocks commit if any check fails
- ✅ Clear error messages

---

## 📄 Worker Files

### Worker `package.json` Template

**Example: `auth-worker/package.json`**

```json
{
	"name": "auth-worker",
	"version": "1.0.0",
	"type": "module",
	"scripts": {
		"lint": "eslint .",
		"format": "prettier --write ."
	},
	"dependencies": {
		"@microlabs/otel-cf-workers": "^1.0.0-rc.52",
		"@opentelemetry/api": "^1.9.0",
		"bcryptjs": "^3.0.3",
		"hono": "^4.10.6",
		"jose": "^6.1.1"
	}
}
```

**Key Points:**

- ✅ Minimal structure - only name, version, type, scripts
- ✅ **No devDependencies** - inherited from root
- ✅ Only `lint` and `format` scripts
- ✅ Runtime dependencies only (hono, jose, etc.)

**All workers follow the same pattern:**

- `cart-worker/package.json`
- `cart-cron-worker/package.json`
- `order-worker/package.json`
- `payment-worker/package.json`
- `fullfilment-worker/package.json`
- `price-worker/package.json`
- `product-worker/package.json`

---

### Worker `wrangler.toml` Template

**Example: `auth-worker/wrangler.toml`**

```toml
name = "auth-worker"
main = "src/index.js"
compatibility_date = "2025-11-07"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true

[[d1_databases]]
binding = "DB"
database_name = "auth-db"
database_id = "YOUR_DATABASE_ID"

[[r2_buckets]]
binding = "LOGS"
bucket_name = "auth-worker-logs"

[env.preview]
name = "auth-worker-preview"

[[env.preview.d1_databases]]
binding = "DB"
database_name = "auth-db"
database_id = "YOUR_DATABASE_ID"

[[env.preview.r2_buckets]]
binding = "LOGS"
bucket_name = "auth-worker-logs"
```

**Example: `cart-worker/wrangler.toml` (with service bindings)**

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

**Key Points:**

- ✅ `main = "src/index.js"` (JavaScript entry point)
- ✅ `compatibility_flags = ["nodejs_compat"]` for Node.js APIs
- ✅ Preview environment configuration
- ✅ Service bindings for inter-worker communication

---

### Worker `src/index.js` Template

**Example: `auth-worker/src/index.js`**

```javascript
/**
 * Auth Worker - Cloudflare Worker
 * Handles authentication and authorization
 */

import { Hono } from 'hono';

// Initialize Hono app
const app = new Hono();

// Health check endpoint
app.get('/health', c => {
	return c.json({
		status: 'ok',
		service: 'auth-worker',
		timestamp: new Date().toISOString(),
	});
});

// Add your routes here
// Example:
// app.post('/api/auth/register', registerHandler);
// app.post('/api/auth/login', loginHandler);

// Export default handler
export default app;
```

**Example: `cart-worker/src/index.js` (with service bindings)**

```javascript
/**
 * Cart Worker - Cloudflare Worker
 * Handles shopping cart operations
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

// Example route using service bindings
app.get('/cart', async c => {
	// Access bindings from c.env
	const db = c.env.DB;
	const cache = c.env.CACHE;
	const productsService = c.env.PRODUCTS_SERVICE;

	// Your cart logic here
	return c.json({ message: 'Cart endpoint' });
});

// Export default handler
export default app;
```

**Key Points:**

- ✅ ES6 modules (`import`/`export`)
- ✅ Hono framework for routing
- ✅ Health check endpoint
- ✅ Access to Cloudflare bindings via `c.env`

---

## 🚀 Setup Instructions

### 1. Install Root Dependencies

```bash
npm install
```

This installs all devDependencies at the root level, which are shared across all workspaces.

### 2. Setup Worker package.json Files

Run the setup script to create minimal package.json files for all workers:

```bash
node scripts/setup-workers.js
```

This will:

- Create minimal `package.json` files with only `lint` and `format` scripts
- Preserve existing runtime dependencies
- Remove all devDependencies (inherited from root)

### 3. Install Worker Dependencies

```bash
npm install
```

This installs runtime dependencies for each worker (hono, jose, etc.) while using shared devDependencies from root.

### 4. Initialize Husky

```bash
npm run prepare
```

This sets up the pre-commit hook.

### 5. Test the Setup

```bash
# Lint all workers
npm run lint

# Format all workers
npm run format
```

---

## ✅ Best Practices Implemented

### 1. **No Duplicated Dependencies**

- All devDependencies (eslint, prettier, wrangler) are at root only
- Workers inherit these via npm workspaces
- Faster installs, smaller node_modules

### 2. **Shared Configuration**

- Single `.eslintrc.cjs` for all workers
- Single `.prettierrc` for consistent formatting
- No duplicated config files

### 3. **Simple Scripts**

- Root: `lint` and `format` only
- Workers: `lint` and `format` only
- No complexity, easy to understand

### 4. **Clean Pre-commit Hook**

- Runs `npm run lint` (which delegates to all workspaces)
- Runs `npm run format` (which formats all workspaces)
- Clear error messages

### 5. **Minimal Worker package.json**

- Only essential fields: name, version, type, scripts
- Runtime dependencies only
- No devDependencies

### 6. **Fast CI/CD**

- Single install command: `npm install`
- Single lint command: `npm run lint`
- Single format command: `npm run format`

---

## 📝 Notes

- **JavaScript Only**: No TypeScript config needed
- **Workspaces**: npm workspaces handle dependency hoisting
- **Wrangler**: Installed at root, available to all workers
- **Husky**: Pre-commit hook ensures code quality
- **Shared Configs**: ESLint and Prettier configs are shared
- **Minimal Workers**: Workers only contain what's necessary

---

## 🔧 Helper Script

### `scripts/setup-workers.js`

This script automatically creates minimal `package.json` files for all workers:

```javascript
#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const WORKERS = [
	'auth-worker',
	'cart-worker',
	'cart-cron-worker',
	'order-worker',
	'payment-worker',
	'fullfilment-worker',
	'price-worker',
	'product-worker',
];

for (const worker of WORKERS) {
	const packageJsonPath = join(process.cwd(), worker, 'package.json');

	if (!existsSync(packageJsonPath)) {
		console.log(`⚠️  ${worker}/package.json not found, skipping`);
		continue;
	}

	try {
		const existingPkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

		// Create minimal package.json
		const minimalPkg = {
			name: existingPkg.name || worker,
			version: existingPkg.version || '1.0.0',
			type: 'module',
			scripts: {
				lint: 'eslint .',
				format: 'prettier --write .',
			},
		};

		// Preserve dependencies if they exist (runtime deps, not devDeps)
		if (existingPkg.dependencies) {
			minimalPkg.dependencies = existingPkg.dependencies;
		}

		// Write back
		writeFileSync(packageJsonPath, JSON.stringify(minimalPkg, null, '\t') + '\n');
		console.log(`✅ Updated ${worker}/package.json`);
	} catch (error) {
		console.error(`❌ Failed to update ${worker}:`, error.message);
	}
}

console.log('\n✅ All worker package.json files updated!');
console.log('Run: npm install');
```

---

## 🎯 Summary

This monorepo structure follows modern best practices:

✅ **Single source of truth** for devDependencies  
✅ **Shared configuration** for linting and formatting  
✅ **Minimal worker package.json** files  
✅ **Fast installs** with dependency hoisting  
✅ **Clean CI/CD** with simple scripts  
✅ **Pre-commit hooks** for code quality  
✅ **No duplication** of configs or dependencies

Perfect for JavaScript Cloudflare Workers! 🚀
