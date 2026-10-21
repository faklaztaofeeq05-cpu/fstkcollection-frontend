# FSTK COLLECTIONS — Frontend

A responsive storefront for FSTK COLLECTIONS, based in Abuja, Nigeria. Customers can browse products, add items to an order, and send an order request to WhatsApp.

## Files
- `index.html` — storefront markup and metadata
- `styles.css` — responsive layout and visual styles
- `app.js` — loads products from the Render API and handles cart / checkout

## API connection
The frontend currently uses `https://fstk-collections-api.onrender.com` for public product listings and order submission. The backend validates product IDs, prices, and stock when an order is submitted.

If hosting this frontend on GitHub Pages or another new domain, add that site's exact origin to the Render service's `CORS_ORIGIN` environment variable, alongside the existing storefront domains. Example format: `https://your-account.github.io,https://fstkcollections.com.ng,https://www.fstkcollections.com.ng`. Do not place the backend admin token, database password, or other secrets in this frontend repository.

## Publish with GitHub Pages
1. Open the repository's **Settings**.
2. Select **Pages**.
3. Under build and deployment, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then save.
5. Add the published GitHub Pages origin to the Render backend's `CORS_ORIGIN` setting if you want the live catalogue and checkout to call the API from that domain.

## WhatsApp
Customer enquiries and order handoff use WhatsApp number `+234 708 375 2801`.

## Important
This repository contains frontend code only. Keep admin authorization and all credentials in the server-side backend environment. Never add `.env` files, API tokens, or database connection strings to this repository.
