# Doodly

A complete, responsive French/Arabic cash-on-delivery storefront for the Doodly Coloring Blanket. Built with Next.js App Router, TypeScript, React, and Tailwind CSS. Typography is self-hosted; the site uses only the supplied product photography.

## Run locally

Requires Node.js 22.18+ (Node 24 recommended) and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp` if needed. Open http://localhost:3000. If PowerShell blocks npm scripts, use `npm.cmd` in place of `npm`.

```sh
npm run typecheck
npm test
npm run build
npm start
```

The lockfile pins the installed dependencies. Deployment needs a Node-compatible Next.js host because order submission and image optimization run on the server.

## Where to edit

| Content | Location |
| --- | --- |
| All prices, shipping, dimensions, delivery/return windows | `src/lib/product.ts` |
| French and Arabic text, labels, alt text, validation and FAQ | `src/lib/translations.ts` |
| Verified customer reviews | `src/lib/reviews.ts` |
| Page composition and product gallery | `src/components/storefront.tsx` |
| Order form, loading, validation, success and error states | `src/components/order-form.tsx` |
| Colors, layout, typography, responsive and RTL styles | `src/app/globals.css` |
| Analytics event adapter | `src/lib/analytics.ts` |
| Product photos, used without alterations | `public/images/product/` |
| SEO and Open Graph metadata | `src/app/layout.tsx` |
| Supplied logo SVGs and brand icon | `public/images/brand/` and `public/icon.svg` |

The default language is French. Language selection persists in local storage when available, and updates the document's `lang` and `dir`. Arabic has authored translations, its own locally served font, mirrored layouts, and accessible form labels. No runtime translation service is used.

## Google Sheets connection

The browser calls `submitOrder(order)` in `src/lib/orders.ts`, which posts to the same-origin `/api/orders` endpoint. The server validates fields, normalizes Moroccan mobile numbers, recalculates all prices, and forwards the order to Google Apps Script. Using the server avoids the Apps Script browser CORS/opaque-response problem. It never logs customer details or claims success from an unreadable response.

Google Apps Script assigns the customer-facing `Numero Commande` after it receives the order, starting at `S892` and incrementing from the highest existing `S` number in column G. A separate submission UUID is used only to prevent duplicate rows when the same browser submission is retried.

1. Create a private Google Sheet for orders.
2. Generate the receiver using `npm run sheets:script`. This reads the central product configuration and writes `integrations/google-apps-script.gs`.
3. In the Sheet, open **Extensions → Apps Script**, paste that file, and save. The generated receiver targets the private `doodly orders` spreadsheet and its existing `Orders` columns.
4. Deploy as a web app that executes as you and accepts access from **Anyone**. This exposes the order receiver, not the private spreadsheet. Google may require owner authorization. Copy the deployment URL ending in `/exec`.
5. Set the environment variable and restart the dev server (or rebuild/redeploy in production):

```dotenv
NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

The supported public variable is not a secret. Prefer the server-only `GOOGLE_SHEETS_WEBHOOK_URL`, which takes precedence, to keep the deployment address out of public configuration. Never put account credentials, private keys, or tokens in `NEXT_PUBLIC_*` variables.

Only HTTPS `script.google.com` receiver URLs are accepted. The receiver must return JSON `{ "success": true }` after saving the row; other responses show an error. Without a configured URL, the page still works, but submitting shows a translated availability message, never a fake success. Development also prints a clear server console warning.

Payload fields include the validated customer/order fields plus `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` attribution captured from the landing-page URL. Orders are mapped into the existing `Orders` worksheet. A single order totals **350 MAD** and two blankets total **600 MAD**, with free delivery.

The form retains an idempotency ID when retrying identical order details. The Apps Script receiver uses a script lock and stored order IDs to avoid duplicate rows after timeouts. Changing order details creates a new order ID. The receiver also recalculates totals and escapes spreadsheet formula prefixes. After pricing changes, regenerate the script, paste the updated receiver, and create a new deployment version.

## Telegram order notifications

After Google Sheets confirms an order, the server can send a private Telegram message containing the generated order number, customer and delivery details, quantity, total, notes, and ad attribution. Telegram failure never prevents a confirmed Sheets order from succeeding.

Create a bot with Telegram's official `@BotFather`, send the new bot `/start`, then configure these server-only variables:

```dotenv
TELEGRAM_BOT_TOKEN=123456789:replace_with_your_bot_token
TELEGRAM_CHAT_ID=123456789
```

Never expose the bot token through a `NEXT_PUBLIC_*` variable. Production hosting must define both variables and redeploy or restart the server.

## Meta Pixel and Conversions API

The storefront loads Meta Pixel for `PageView` and `ViewContent`, reports `InitiateCheckout` when the order form is first used, records offer selection as `SelectOffer`, and sends `Purchase` only after Google Sheets confirms the order. Browser and server `Purchase` events share the submission UUID as `event_id`, allowing Meta to deduplicate them.

Configure these variables in every production environment and redeploy:

```dotenv
SITE_URL=https://your-production-domain.example
META_PIXEL_ID=123456789012345
META_CAPI_ACCESS_TOKEN=replace_with_your_server_token
META_GRAPH_API_VERSION=v26.0
```

`META_CAPI_ACCESS_TOKEN` must remain server-only. `META_CAPI_TEST_EVENT_CODE` can be added temporarily while using Test Events in Meta Events Manager, then removed. CAPI hashes the customer's normalized phone, first and last name, city, country, and external ID. It also sends `_fbp`, `_fbc`, IP address, and user agent when available. Delivery address and notes are never sent to Meta. CAPI failures do not prevent a confirmed order from succeeding.

The internal `doodly:analytics` window event remains available for the storefront interaction names: `hero_cta_click`, `select_single_blanket`, `select_two_blankets`, `begin_order`, `order_success`, and `language_change`.

## Before launch

- Connect the actual Apps Script deployment and place a test order to verify the real Sheet. No endpoint or account has been connected by this implementation.
- Replace the explicitly marked contact, Instagram, privacy, and terms placeholders with your real information. No company details or reviews have been invented.
- Add real testimonials to `src/lib/reviews.ts`; optional review photos should use local public paths.
- Set `SITE_URL` to the final production origin so social image URLs resolve on that domain. It defaults to `http://localhost:3000` for local use. No production domain has been guessed.
- Apply appropriate host-level abuse protection to `/api/orders` for your deployment and traffic.

The site respects reduced motion, supports keyboard navigation and native accessible FAQ disclosure, labels validation errors, preserves image proportions, and hides the mobile sticky CTA while the order section is visible.

## Verification

`npm test` covers both totals, free shipping, Moroccan phone formats including Arabic digits, required-field validation, length limits, confirmed submissions, unconfigured webhook responses, non-JSON responses, and network failure. The real Sheets service requires the deployment URL above; no unit test sends data to Google.
