# Fulfillment Worker API Documentation

## Overview
The fulfillment worker handles inventory management, warehouse selection, and delivery cost calculation based on postal codes and product availability.

## Endpoints

### 1. Get Stock Details

**Endpoint:** `GET /api/stock/:product_id/:size`

**Description:** Returns stock availability for a specific product and size across all warehouses.

**Parameters:**
- `product_id` (path): Product ID
- `size` (path): Shoe size (e.g., "7", "8", "9")

**Response:**
```json
{
  "success": true,
  "product_id": "uuid-here",
  "size": "9",
  "total_stock": 120,
  "warehouses": [
    {
      "warehouse_id": "wh_001",
      "warehouse_name": "Mumbai Central Warehouse",
      "sku": "P0001",
      "size": "9",
      "quantity": 45,
      "express_available": true,
      "all_sizes_stock": {
        "7": 30,
        "8": 40,
        "9": 45,
        "10": 35
      },
      "currency": "INR",
      "updated_at": "2025-11-15T10:00:00Z"
    }
  ],
  "available_in_warehouses": 3
}
```

**Example:**
```bash
curl https://fulfillment-worker.example.workers.dev/api/stock/abc123/9
```

---

### 2. Fulfillment Check (Main Logic)

**Endpoint:** `POST /api/fulfillment/check`

**Description:** Complex fulfillment logic that determines warehouse allocation, delivery costs, and availability for a given order.

**Request Body:**
```json
{
  "postal_code": "400001",
  "product_id": "uuid-here",
  "size": "9",
  "quantity": 5
}
```

**Logic Flow:**

1. **Find Warehouses for Postal Code**
   - Searches `postal_code_warehouse_map` to find which warehouses serve the postal code
   - Warehouses are ordered by priority (nearest first)

2. **Check Product Availability**
   - Queries `product_inventory` for the product in priority warehouses
   - Parses stock JSON to get quantity for requested size

3. **Allocate Quantity Across Warehouses**
   - Allocates from 1st priority warehouse first
   - If stock insufficient, moves to 2nd, 3rd, etc.
   - Stops when full quantity is allocated OR stock runs out

4. **Determine Delivery Tiers**
   - 1st warehouse used = `tier_1`
   - 2nd warehouse used = `tier_2`
   - 3rd+ warehouses used = `tier_3`
   - **Highest tier determines delivery cost** (e.g., if tier_3 is used, tier_3 costs apply)

5. **Check Express Eligibility**
   - Product must have `express_available = 1` in at least one warehouse
   - Returns express delivery cost if available

6. **Calculate Delivery Costs**
   - Fetches costs from `delivery_cost_config` for the highest tier used
   - Returns both standard and express costs

**Success Response:**
```json
{
  "success": true,
  "available": true,
  "fulfillment": {
    "product_id": "uuid-here",
    "size": "9",
    "requested_quantity": 5,
    "fulfilled_quantity": 5,
    "allocations": [
      {
        "warehouse_id": "wh_001",
        "warehouse_name": "Mumbai Central Warehouse",
        "allocated_quantity": 3,
        "available_stock": 45,
        "base_days": 1,
        "tier": "tier_1",
        "express_available": true,
        "currency": "INR"
      },
      {
        "warehouse_id": "wh_007",
        "warehouse_name": "Pune West Warehouse",
        "allocated_quantity": 2,
        "available_stock": 30,
        "base_days": 2,
        "tier": "tier_2",
        "express_available": true,
        "currency": "INR"
      }
    ]
  },
  "delivery": {
    "postal_code": "400001",
    "region": "Mumbai Metro",
    "state": "Maharashtra",
    "highest_tier": "tier_2",
    "tier_description": "Regional warehouse (2-3 days)",
    "standard_delivery_cost": 49.00,
    "express_delivery_cost": 149.00,
    "express_available": true,
    "free_delivery_threshold": 2999.00,
    "currency": "INR",
    "estimated_days": {
      "min": 1,
      "max": 2
    }
  },
  "warehouses_used": 2,
  "tiers_used": ["tier_1", "tier_2"]
}
```

**Insufficient Stock Response:**
```json
{
  "success": false,
  "available": false,
  "error": "Insufficient stock",
  "requested_quantity": 100,
  "available_quantity": 45,
  "message": "Only 45 units available. 55 units short.",
  "partial_allocations": [...]
}
```

**No Coverage Response:**
```json
{
  "success": false,
  "error": "No warehouse coverage for this postal code",
  "postal_code": "999999",
  "message": "Delivery not available to this area"
}
```

**Example:**
```bash
curl -X POST https://fulfillment-worker.example.workers.dev/api/fulfillment/check \
  -H "Content-Type: application/json" \
  -d '{
    "postal_code": "400001",
    "product_id": "abc123",
    "size": "9",
    "quantity": 5
  }'
```

---

## Key Concepts

### Warehouse Priority
- Warehouses are ordered by proximity to the delivery address
- 1st warehouse = nearest (fastest delivery)
- 2nd warehouse = regional (moderate delivery)
- 3rd+ warehouses = distant (slower delivery)

### Delivery Tiers
| Tier | Description | Standard Cost | Express Cost |
|------|-------------|---------------|--------------|
| tier_1 | Nearest warehouse (1-2 days) | ₹0 | ₹99 |
| tier_2 | Regional warehouse (2-3 days) | ₹49 | ₹149 |
| tier_3 | Distant warehouse (3-4 days) | ₹99 | ₹249 |

**Important:** The highest tier used determines the cost. If you need items from both tier_1 and tier_3 warehouses, you pay tier_3 costs.

### Express Delivery
- Available only if `express_available = 1` for the product in at least one warehouse
- Costs vary by tier
- Faster delivery (1-2 days reduction)

### Stock Allocation Example

**Scenario:** User orders 10 units of size 9, postal code 400001

1. Priority warehouses for 400001: `wh_001` (7 units), `wh_007` (15 units), `wh_003` (5 units)
2. Allocate 7 units from `wh_001` (tier_1), 3 remaining
3. Allocate 3 units from `wh_007` (tier_2), 0 remaining
4. Order fulfilled! Costs = tier_2 (highest tier used)

---

## UI Integration Flow

### When User Clicks Checkout:

```javascript
// 1. Get user's address (postal code)
const postalCode = userAddress.postal_code;

// 2. For each item in cart, check fulfillment
const items = cart.items;
const fulfillmentChecks = [];

for (const item of items) {
  const response = await fetch('https://fulfillment-worker.example.workers.dev/api/fulfillment/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postal_code: postalCode,
      product_id: item.product_id,
      size: item.size,
      quantity: item.quantity
    })
  });
  
  const result = await response.json();
  fulfillmentChecks.push(result);
}

// 3. Calculate total delivery cost (use highest tier across all items)
const allTiers = fulfillmentChecks.flatMap(fc => fc.tiers_used || []);
const highestTier = ['tier_3', 'tier_2', 'tier_1'].find(t => allTiers.includes(t));

// 4. Display delivery options to user
const deliveryCost = fulfillmentChecks.find(fc => fc.delivery?.highest_tier === highestTier)?.delivery;

// Show:
// - Standard Delivery: ₹{deliveryCost.standard_delivery_cost} ({estimated_days.max} days)
// - Express Delivery: ₹{deliveryCost.express_delivery_cost} ({estimated_days.min} days) [if available]
```

---

## Database Schema Reference

### product_inventory
- `product_id` + `warehouse_id` = UNIQUE
- `stock` = JSON: `{"6": 20, "7": 10, "8": 15}`
- `express_available` = 0 or 1

### postal_code_warehouse_map
- Maps postal code ranges to warehouses
- `warehouses` = JSON array with priority order

### delivery_cost_config
- 3 tiers: tier_1, tier_2, tier_3
- Each has standard and express costs
- `free_delivery_threshold` for free shipping

---

## Error Handling

| Error | Status | Reason |
|-------|--------|--------|
| Product not found | 404 | Product doesn't exist in any warehouse |
| No coverage | 404 | Postal code not served by any warehouse |
| Insufficient stock | 400 | Not enough stock to fulfill order |
| Missing fields | 400 | Required fields missing in request |
| Server error | 500 | Database or processing error |

---

## Development

### Install dependencies:
```bash
npm install
```

### Run locally:
```bash
npm run dev
```

### Deploy:
```bash
npm run deploy
```

### Test endpoints:
```bash
# Health check
curl http://localhost:8787/

# Stock check
curl http://localhost:8787/api/stock/abc123/9

# Fulfillment check
curl -X POST http://localhost:8787/api/fulfillment/check \
  -H "Content-Type: application/json" \
  -d '{"postal_code":"400001","product_id":"abc123","size":"9","quantity":5}'
```

