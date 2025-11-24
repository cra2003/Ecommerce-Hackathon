# How to Find CF-Ray ID in Browser Developer Tools

The CF-Ray ID is a unique identifier that Cloudflare assigns to each request. Here's where to find it:

## Method 1: Network Tab (Response Headers)

1. **Open Developer Tools**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
   - Or right-click → "Inspect"

2. **Go to Network Tab**
   - Click on the "Network" tab in Developer Tools

3. **Make a Request**
   - Reload the page or trigger an API call
   - You'll see all network requests listed

4. **Find Your Request**
   - Click on the request to your products-worker API
   - Example: `https://products-worker.aadhi18082003.workers.dev/products`

5. **Check Response Headers**
   - Click on the "Headers" tab
   - Scroll down to "Response Headers"
   - Look for `cf-ray` or `CF-Ray`
   - It will look like: `cf-ray: 8a1b2c3d4e5f6g7h-ABC`

## Method 2: Using JavaScript Console

You can also access it programmatically:

```javascript
// After making a fetch request
fetch('https://products-worker.aadhi18082003.workers.dev/products')
  .then(response => {
    const cfRay = response.headers.get('cf-ray')
    console.log('CF-Ray ID:', cfRay)
  })
```

## Method 3: Using curl

```bash
curl -I https://products-worker.aadhi18082003.workers.dev/products
```

Look for the `cf-ray:` header in the output.

## Why You Might Not See It

1. **CORS Restrictions**: If the header isn't exposed via CORS, it won't be visible to JavaScript
   - ✅ **Fixed**: We've updated CORS to expose `cf-ray` header

2. **Not Going Through Cloudflare**: If the request doesn't go through Cloudflare, there won't be a CF-Ray
   - Make sure you're accessing the worker via `*.workers.dev` domain

3. **Browser Caching**: Try a hard refresh (`Cmd+Shift+R` or `Ctrl+Shift+R`)

## What It Looks Like

The CF-Ray ID format is: `[8-character-hex]-[3-letter-location]`

Example: `8a1b2c3d4e5f6g7h-ABC`

- First part: Unique request identifier
- Second part: Cloudflare data center location code

## Troubleshooting

If you still can't see it:

1. **Check if the worker is deployed**: Make sure you've deployed the latest version with CORS updates
2. **Check browser console**: Look for any CORS errors
3. **Try incognito mode**: Browser extensions might interfere
4. **Check Network tab filters**: Make sure "All" is selected, not just "XHR" or "Fetch"

