# Requirements traceability: initial publication work

This is an initial, incomplete audit of the supplied redesign brief, not a
certification of the complete system. "Existing" means code or tests were
observed; it does not mean the complete workflow has been verified against a
real database or production.

## Publication investigation

- The previous homepage did not load or display vehicle data. The existing
  public vehicle search was date-based and excluded vehicles without a valid
  rate or with an overlapping booking, maintenance job or availability block.
- Staff create vehicles as unpublished drafts and publish them by editing the
  vehicle; images have a separate publication control. These rules remain.
- The client appends both `/auth` and `/v1` routes to an `/api` base, while the
  deployment documentation specifies a base ending in `/api/v1`. That mismatch
  would break requests when configured as documented; the actual production
  build configuration has not been verified.
- The existing default cross-origin resource policy prevents public images
  from being embedded by a different-origin website. The new response header
  applies only to successfully retrieved public images.
- The actual cause of a particular production vehicle not appearing cannot be
  established without checking that vehicle's publication, status, images,
  rates, and deployed versions/configuration.

## Requirements

| Requirement | Status and evidence |
|---|---|
| Vehicle publication and image management | Existing staff controls; new public catalogue uses active, unarchived, published vehicles and published images. Mocked service tests cover the query; the complete create-to-publish workflow remains unverified. |
| Homepage published fleet | Implemented using the catalogue API, with loading/error/empty states. Populated cards have not been verified against a real database. Sorting uses last update, not publication time; publication time is not stored. |
| Catalogue and details | Implemented basic search, category, fuel, transmission, minimum seats, pagination, public specifications, gallery and current rates. Price filters, sort controls, richer design and real-data verification remain. |
| Date availability and booking requests | Existing availability and request APIs are reused; the vehicle details action passes a vehicle ID to the existing search. Full customer journey and concurrency scenarios were not reverified against a database. |
| Public services, locations, contact, reviews and footer | Pending redesign and verification of real business content; no reviews or business claims were fabricated. |
| Staff layout and dashboards | Pending requested redesign and full audit; no dashboard statistics were added. |
| Authentication, password setup/reset and RBAC | Existing implementation and automated tests; full requirements and operational audit pending. |
| Staff, vehicle inventory, pricing and packages | Existing modules; full requirements and workflow audit pending. |
| Customer management, booking confirmation/cancellation and calendar | Existing booking functionality; complete requirements and workflow audit pending. |
| Handover, return, mileage, fuel and damage | Existing rental-operations functionality; complete requirements and workflow audit pending. |
| Payments, advances, deposits and refunds | Full requirements and workflow audit pending; no payment or financial rules were changed. |
| Maintenance, service reminders and vehicle document expiry | Existing vehicle and maintenance data; complete requirements and workflow audit pending. |
| Expenses, approvals, financial reports, profitability and utilisation | Full requirements and workflow audit pending. |
| Audit logs and notifications | Existing mechanisms; complete requirements and delivery audit pending. |
| SEO, accessibility and performance | Partial existing client-rendered site; crawler-ready metadata, sitemap, comprehensive accessibility and performance checks remain. |
| Responsive design | Browser error-state checks at 320, 768 and 1440 pixels showed no horizontal overflow on the homepage or catalogue. Populated cards, detail and staff screens still need validation. |
| GitHub Actions and deployment | No workflow changed or deployment performed. Both repositories must be deployed compatibly before the new frontend can use the new API. Production configuration and actual deployment remain unverified. |

## Validation and release follow-up

- Backend: 57 automated tests passed and ESLint passed locally on Node 23.
  New tests use database/service doubles; they do not prove MySQL behavior.
- Frontend: Vite production build and the route regression test passed.
  Earlier browser checks used an unavailable local API to exercise error
  states and confirmed requests use `/api/v1/public` and `/api/auth`.
- No schema changes or migrations were introduced. No production database was
  accessed or modified and no deployment was performed.
- Before release, test the full creation, image publication, pricing,
  publication, homepage, detail, availability, booking and unpublication
  workflow on an approved non-production MySQL environment. Verify private
  fields and unpublished images remain inaccessible and check populated
  layouts on mobile, tablet and desktop.
- Vehicle audit history previously sorted by the nonexistent `createdAt`
  field and displayed the same nonexistent field. The local fix uses
  `occurredAt` on both sides; a deployed/database verification is still needed.
- Complete the remaining public and staff redesign, requirements audit,
  integration/end-to-end and security checks before claiming the brief is
  complete.
