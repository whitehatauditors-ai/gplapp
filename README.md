# GPLApp — Global Pack Logistics Portal

Browser-first summary portal scaffold for Global Pack Logistics, based on the approved Lluberes portal structure.

## Current status

- Repository: `whitehatauditors-ai/gplapp`
- Frontend: `web/index.html`
- Logo: `web/assets/gpl-logo.jpg`
- Deployment root: `web/`
- Google credentials: none in this repository

This initial scaffold updates the customer identity and supplied logo only. The current warehouse selection and payment-calculation behavior remain the Lluberes template defaults until GPL supplies the authoritative warehouse, workbook-column, payment-rate, claims, and access requirements. Do not treat this repository as production-ready until those rules are confirmed.

## Template behavior

- Browser-side XLSX parsing and summary generation
- HTML, XLSX, and ZIP downloads
- Login screen matching the Lluberes template
- No server-side credential or Google Drive access

## Deployment

The GitHub Actions workflow deploys `web/` to Cloudflare Pages on pushes to `main`. Configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repository secrets before enabling production deployment.

## Required GPL decisions before production

1. Public Cloudflare Pages project and branded route
2. Warehouse name/selection behavior
3. Authoritative workbook sheets and column mappings
4. Payment rates and status rules
5. Claims source and deduction behavior
6. Login/access requirements
7. Manager-dashboard registration
