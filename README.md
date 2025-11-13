# Shopify Churn Cost Calculator

Modern lead magnet landing page that quantifies the revenue impact of customer churn for Shopify stores. Built with Vite, React 18, TypeScript, Tailwind CSS, and supporting libraries for data visualisation, forms, PDF export, and HubSpot CRM integration.

## Getting Started

```bash
npm install
npm run dev
```

Visit http://localhost:5173 to view the app.

## Environment Variables

1. Copy `.env.example` to `.env.local`.
2. Provide your HubSpot private app token:

```
VITE_HUBSPOT_ACCESS_TOKEN=your_hubspot_private_app_token
```

This token powers the HubSpot CRM lead capture flow in `src/utils/hubspot.ts`. The application will run without it, but contact submission will be disabled.

## Project Structure

- `src/components` – Landing page UI primitives (hero form, progress, results, email capture).
- `src/utils` – Calculation engine and HubSpot helper functions.
- `src/types` – Shared TypeScript interfaces used across the app.

## Available Scripts

- `npm run dev` – Start the Vite dev server.
- `npm run build` – Create a production build.
- `npm run preview` – Preview the production build locally.
