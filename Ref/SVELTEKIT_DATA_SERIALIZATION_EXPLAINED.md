# SvelteKit Data Serialization Explained

## How the Load Function is Called

### 1. Initial Page Load (SSR)

When you first visit `/products`:

```
Browser Request → SvelteKit Server
    ↓
SvelteKit runs: +page.server.js → load({ fetch, url })
    ↓
load() function executes:
  - Fetches products from API
  - Fetches prices from API
  - Fetches stock from API
  - Returns: { products, pagination, filters, activeFilters }
    ↓
SvelteKit serializes the data using "devalue"
    ↓
Data is embedded in HTML as JSON
    ↓
Browser receives HTML with data already included
```

### 2. Client-Side Navigation (SPA)

When you change filters or pagination:

```
User clicks filter → goto('/products?category=Sneakers')
    ↓
SvelteKit intercepts navigation
    ↓
Fetches: GET /products/__data.json?x-sveltekit-invalidated=01
    ↓
SvelteKit server runs: +page.server.js → load({ fetch, url })
    ↓
load() function executes (same as above)
    ↓
SvelteKit serializes using "devalue"
    ↓
Returns compact serialized JSON
    ↓
Client deserializes and updates page
```

---

## What is "devalue"?

**devalue** is a library SvelteKit uses to serialize JavaScript data structures into JSON. It's different from `JSON.stringify()` because:

1. **Handles circular references** - Can serialize objects that reference themselves
2. **Deduplicates data** - Reuses references to avoid duplicating the same object
3. **More compact** - Smaller payload size
4. **Type-safe** - Preserves special types (Dates, RegExp, etc.)

---

## The Serialized Format Explained

### Your Load Function Returns:

```javascript
return {
  products: [
    {
      id: "036bdd3b-584a-45c5-9b3f-758265267c75",
      name: "Skyline Vapour Alpha",
      image: "https://...",
      price: 2889,
      base_price: 2889,
      inStock: true,
      isOnSale: true,
      discountPercentage: 27.78,
      sizes: ["7", "8", "9", "10", "11"]
    },
    {
      id: "ab0f01ee-5309-4d2c-bdb6-3412e6534483",
      name: "AeroStride Flux",
      image: "https://...",
      price: 8568,
      base_price: 8568,
      inStock: true,
      isOnSale: false,
      discountPercentage: null,
      sizes: ["5", "6", "7", "8", "9"]
    }
  ],
  pagination: { page: 1, totalPages: 5, ... },
  filters: { categories: [...], brands: [...] },
  activeFilters: { category: "Sneakers" }
}
```

### devalue Serializes It As:

```json
{
  "type": "data",
  "nodes": [
    { "type": "skip" },
    {
      "type": "data",
      "data": [
        {
          "products": 1,      // Reference to index 1
          "pagination": 94,    // Reference to index 94
          "filters": 99,       // Reference to index 99
          "activeFilters": 123 // Reference to index 123
        },
        [2, 15, 25, ...],     // Array of references to products
        {
          "id": 3,            // Reference to index 3 (the UUID string)
          "name": 4,          // Reference to index 4 (the name string)
          "image": 5,         // Reference to index 5 (the image URL)
          "price": 6,         // Reference to index 6 (the price number)
          "base_price": 6,     // Same reference as price (deduplication!)
          "inStock": 7,       // Reference to index 7 (the boolean true)
          "isOnSale": 7,      // Same reference as inStock (deduplication!)
          "discountPercentage": 8,
          "sizes": 9          // Reference to index 9 (the sizes array)
        },
        "036bdd3b-584a-45c5-9b3f-758265267c75",  // Index 3
        "Skyline Vapour Alpha",                   // Index 4
        "https://...",                            // Index 5
        2889,                                     // Index 6
        true,                                     // Index 7
        27.78,                                    // Index 8
        ["7", "8", "9", "10", "11"],            // Index 9
        // ... more data
      ]
    }
  ]
}
```

---

## How devalue Works

### Step 1: Build Reference Map

devalue walks through your data structure and creates a flat array of all unique values:

```javascript
// Your data:
{
  products: [
    { id: "abc", name: "Product 1", price: 100, base_price: 100 }
  ]
}

// devalue creates:
[
  0: { products: [1] },           // Main object
  1: [{ id: 2, name: 3, price: 4, base_price: 4 }],  // Products array
  2: "abc",                        // id string
  3: "Product 1",                  // name string
  4: 100                           // price number (reused for base_price!)
]
```

### Step 2: Replace Values with References

Instead of duplicating `100` for both `price` and `base_price`, devalue:
- Stores `100` once at index 4
- Uses reference `4` for both `price` and `base_price`

This is why you see:
```json
{
  "price": 6,
  "base_price": 6  // Same reference!
}
```

### Step 3: Serialize to JSON

The reference array is serialized as JSON, creating the compact format you see.

---

## Why This Format?

### Benefits:

1. **Deduplication** - Same values stored once
   ```javascript
   // Without devalue:
   { price: 100, base_price: 100 }  // 100 stored twice
   
   // With devalue:
   [100]  // Stored once, referenced twice
   ```

2. **Circular References** - Can handle objects that reference themselves
   ```javascript
   const obj = { name: "test" };
   obj.self = obj;  // Circular reference
   // JSON.stringify() would fail, devalue handles it
   ```

3. **Smaller Payload** - Especially for large arrays with repeated values
   ```javascript
   // 1000 products, all with inStock: true
   // Without devalue: "inStock":true repeated 1000 times
   // With devalue: true stored once, referenced 1000 times
   ```

4. **Type Preservation** - Preserves Dates, RegExp, etc.

---

## How SvelteKit Uses It

### On the Server:

```javascript
// +page.server.js
export async function load({ fetch, url }) {
  return {
    products: [...],
    pagination: {...}
  };
}
```

SvelteKit internally does:
```javascript
import { stringify } from 'devalue';
const serialized = stringify(data);
// Returns the compact format you see
```

### On the Client:

When the client receives the data:

```javascript
import { parse } from 'devalue';
const data = parse(serializedJson);
// Reconstructs the original object structure
```

Then in your component:
```svelte
<script>
  let { data } = $props();
  // data is already deserialized!
  // You can use data.products, data.pagination, etc.
</script>
```

---

## Where You See This

### In Network Tab:

When you see:
```
GET /products/__data.json?x-sveltekit-invalidated=01
```

The response is the devalue-serialized format. SvelteKit automatically:
1. Receives the serialized JSON
2. Deserializes it using `devalue.parse()`
3. Passes it to your component as `data` prop
4. Your component receives the **original object structure**

---

## Example: Complete Flow

### 1. Load Function Returns:

```javascript
// +page.server.js
return {
  products: [
    { id: "1", name: "Shoe", price: 100, base_price: 100 }
  ]
};
```

### 2. SvelteKit Serializes:

```javascript
// Internally uses devalue.stringify()
const serialized = stringify({
  products: [
    { id: "1", name: "Shoe", price: 100, base_price: 100 }
  ]
});

// Result (simplified):
{
  "nodes": [
    {
      "data": [
        { "products": 1 },
        [{ "id": 2, "name": 3, "price": 4, "base_price": 4 }],
        "1",
        "Shoe",
        100
      ]
    }
  ]
}
```

### 3. Sent to Client:

```json
// Response from /products/__data.json
{
  "type": "data",
  "nodes": [
    {
      "type": "data",
      "data": [
        { "products": 1 },
        [{ "id": 2, "name": 3, "price": 4, "base_price": 4 }],
        "1",
        "Shoe",
        100
      ]
    }
  ]
}
```

### 4. Client Deserializes:

```javascript
// SvelteKit internally does:
const data = parse(responseJson);

// Result:
{
  products: [
    { id: "1", name: "Shoe", price: 100, base_price: 100 }
  ]
}
```

### 5. Component Receives:

```svelte
<script>
  let { data } = $props();
  // data.products is the original array!
  // data.pagination is the original object!
</script>
```

---

## Key Takeaways

1. **You don't need to worry about the serialization format** - SvelteKit handles it automatically

2. **Your load function returns normal JavaScript objects** - The serialization happens behind the scenes

3. **Your component receives normal JavaScript objects** - The deserialization happens automatically

4. **The compact format is for efficiency** - Smaller payload, faster transfers

5. **References prevent duplication** - Same values stored once, referenced multiple times

---

## Debugging

If you want to see the actual data structure in your component:

```svelte
<script>
  let { data } = $props();
  
  $effect(() => {
    console.log('Actual data structure:', data);
    // This shows the deserialized, original structure
    // Not the devalue format!
  });
</script>
```

The devalue format is only visible in:
- Network tab (raw response)
- SvelteKit's internal serialization

Your component code always works with the original data structure!

