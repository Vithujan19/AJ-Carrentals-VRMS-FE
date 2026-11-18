# AJ Car Rentals Frontend

React + Vite frontend for the AJ Car Rentals Vehicle Rental Management System.
The public website is under development; see [PUBLIC_WEBSITE.md](./docs/PUBLIC_WEBSITE.md).
The staff dashboard is at `/portal`, with sign-in at `/login`.

## Local development

1. Use Node.js 22 and run `npm install`.
2. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the backend `/api` origin.
3. Start the portal with `npm run dev`.

The API must have a provisioned database, a seeded permission catalog, and an administrator account before staff can sign in. The frontend never connects to MySQL.

## Authentication

API calls use `credentials: include` and the backend's HttpOnly session cookie. The portal first requests a CSRF token, then sends it as `X-CSRF-Token` for state-changing requests. Configure the backend `FRONTEND_ORIGINS` to exactly match the portal origin and serve both applications over HTTPS on same-site hosts in production.

New staff accounts remain pending until an administrator generates and securely
shares a setup token. Staff enter setup or reset tokens at `/reset-password`;
the application does not send password setup or reset emails.

Frontend route guards and hidden navigation are for usability only. The backend validates every permission and resource-level access rule.

## Vehicle inventory

Staff with vehicle permissions can search/filter fleet records and manage vehicle details, images, private documents, effective-dated pricing, mileage readings, and available maintenance/booking history. Maintainers are limited to assigned vehicles for vehicle and mileage views. Public vehicle images are shown only after a staff member explicitly publishes them; private vehicle documents are fetched through authenticated download routes.

Public booking searches and images require an active vehicle to be explicitly published in its edit form; the image must also be published. Existing vehicles default to unpublished. Apply the reviewed backend publication migration before using this version.

## Build

Run `npm run build` to generate the static site in `dist/`. Deploy the static assets through LankaHost's supported web hosting/reverse-proxy setup; route API requests to the backend origin and preserve credentialed CORS and HTTPS cookie behavior.

The workflow in `.github/workflows/frontend-ci-cd.yml` runs a CI build with a
non-production placeholder API URL. Its production job intentionally fails
and does not deploy. Frontend lint and automated test scripts are not yet
configured. The shared deployment runbooks are in the backend repository's
`docs` directory.
