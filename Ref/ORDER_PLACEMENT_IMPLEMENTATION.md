# Order Placement Implementation

## Overview

Complete implementation of order placement with atomicity, race condition handling, and stock deduction.

## Files Created/Modified

### 1. Fulfillment Worker (`fullfilment-worker/src/index.js`)

**Added Endpoints:**

#### `POST /api/stock/deduct`

- **Purpose**: Atomically deduct stock from a specific warehouse
- **Race Condition Prevention**: Uses optimistic locking (UPDATE WHERE stock = old_value)
- **Returns 409 Conflict** if stock changed during transaction
- **Validates** sufficient stock before deduction

#### `POST /api/stock/restore`

- **Purpose**: Restore stock (for order cancellation/rollback)
- **Use Case**: Rollback when order placement fails mid-way

### 2. Order Worker Migration (`order-worker/migrations/0001_orders_tables.sql`)

**Tables Created:**

```sql
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  products TEXT NOT NULL,              -- JSON with fulfillment allocations
  address TEXT NOT NULL,               -- JSON shipping address
  delivery_mode TEXT NOT NULL,         -- 'standard' or 'express'
  delivery_tier TEXT NOT NULL,         -- 'tier_1', 'tier_2', 'tier_3'
  subtotal DECIMAL(10,2),
  delivery_cost DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  estimated_delivery_date TEXT,
  tracking_number TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE order_status_history (
  history_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  reason TEXT,
  created_at DATETIME,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
```

### 3. Cart Worker - Place Order Endpoint

**Location**: `cart-worker/src/index.js`
**Endpoint**: `POST /cart/place-order`

#### Flow:

1. **Validate Cart & Address**
   - Check cart has products
   - Check shipping address exists

2. **Re-verify Stock with Fulfillment**
   - For EACH product, call `/api/fulfillment/check`
   - Get warehouse allocations
   - Abort if ANY product out of stock

3. **Calculate Totals**
   - Subtotal from products
   - Delivery cost based on mode (standard/express) and tier
   - Tax (10%)
   - Total

4. **Create Order Record**
   - Store products WITH fulfillment allocations
   - Store address, delivery info, totals
   - Status: 'pending'

5. **Deduct Stock (CRITICAL SECTION)**
   - For each product's allocations:
     - Call `/api/stock/deduct` for each warehouse
     - If ANY deduction fails:
       - **ROLLBACK**: Call `/api/stock/restore` for all successful deductions
       - Abort order
   - If race condition detected (409): Abort immediately

6. **Mark Cart as Completed**
   - Don't delete (audit trail)
   - Set status = 'completed'

7. **Return Order Confirmation**

## Race Condition Handling

### Scenario: Two users order last item simultaneously

**User A** and **User B** both try to order the last shoe (size 9) at the same time.

```
Time    User A                          User B
----    ------                          ------
T1      Check stock: 1 available        Check stock: 1 available
T2      Read stock JSON: {"9": 1}       Read stock JSON: {"9": 1}
T3      Calculate new: {"9": 0}         Calculate new: {"9": 0}
T4      UPDATE ... WHERE stock=old      (waiting...)
T5      ✅ Success (changes=1)          UPDATE ... WHERE stock=old
T6      Stock now: {"9": 0}             ❌ Fail (changes=0, stock changed!)
T7      Order confirmed                 Return 409 Conflict
```

**Key**: The `UPDATE ... WHERE stock = ?` with old value ensures only ONE update succeeds.

## Service Bindings Required

### In `cart-worker/wrangler.toml`:

```toml
[[services]]
binding = "FULFILLMENT_SERVICE"
service = "fullfilment-worker"

[[services]]
binding = "ORDER_SERVICE"
service = "order-worker"
```

### In `order-worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "orders-db"
database_id = "<your-d1-id>"
```

## Database Setup Commands

```bash
# 1. Create orders database
npx wrangler d1 create orders-db

# 2. Run migration
cd order-worker
npx wrangler d1 migrations apply orders-db --remote

# 3. Deploy workers
cd ../fullfilment-worker && npx wrangler deploy
cd ../cart-worker && npx wrangler deploy
cd ../order-worker && npx wrangler deploy
```

## Frontend Integration

### API Call (from checkout summary page):

```javascript
const placeOrder = async deliveryMode => {
	const token = get(accessToken);
	const res = await fetch(`${CART_API}/cart/place-order`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ delivery_mode: deliveryMode }),
		credentials: 'include',
	});

	if (!res.ok) {
		const data = await res.json();
		throw new Error(data.error || 'Order failed');
	}

	return res.json();
};
```

## Edge Cases Handled

✅ **Stock changed between summary and order**: Re-verified before deduction
✅ **Race condition (2 users, 1 item)**: Optimistic locking prevents double-sale
✅ **Partial deduction failure**: Automatic rollback of successful deductions
✅ **Network failure mid-order**: Transaction-like behavior with rollback
✅ **Cart empty**: Validated before processing
✅ **No shipping address**: Validated before processing
✅ **Invalid delivery mode**: Defaults to 'standard'

## Testing Checklist

- [ ] Single user places order successfully
- [ ] Stock is deducted correctly from warehouses
- [ ] Cart marked as completed after order
- [ ] Order appears in orders table with correct data
- [ ] Two users ordering last item: Only one succeeds
- [ ] Order with insufficient stock: Rejected
- [ ] Order with multiple products from different warehouses: All deducted
- [ ] Failed deduction mid-order: Previous deductions rolled back
- [ ] Order summary shows correct delivery cost for mode
- [ ] Estimated delivery date stored correctly

## Monitoring

Check logs for:

- `[place-order]` - Order placement flow
- `[stock-deduct]` - Stock deduction operations
- `[stock-restore]` - Rollback operations
- Race condition detections (409 responses)
- Rollback triggers

## Next Steps

1. Add payment integration (update `payment_status`)
2. Add order status transitions (pending → paid → processing → shipped → delivered)
3. Add order cancellation endpoint (with stock restoration)
4. Add admin endpoints for order management
5. Add email notifications
6. Add order tracking
