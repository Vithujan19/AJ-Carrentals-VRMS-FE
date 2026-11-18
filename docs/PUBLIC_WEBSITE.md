# Public website

## Initial design direction

The public website retains the existing AJ text mark and portal palette rather
than inventing a separate identity: deep green `#12342b`, pale green `#d7ed9f`,
off-white `#f3f6f4`, and dark text `#183229`. Company photography, logo artwork,
contact details and business policies must be supplied by the business before
they can be published.

## Implementation status

The public homepage and date-based booking request use the existing booking
API. Requests are not reservations; staff recheck availability on
confirmation. The staff dashboard is at `/portal`; existing staff fleet and
booking routes remain unchanged.

The homepage and `/fleet` catalogue request active, published vehicles from
the public vehicle API, regardless of current bookings, maintenance or rates.
Public details and image delivery apply the same publication and lifecycle
rules. Existing vehicles default to unpublished; authorized staff can publish
them from the vehicle edit form. Images must also be published individually.
Booking searches additionally require availability and an applicable active
rate; requests remain pending until confirmed by staff.

Contact and policy pages, Google reviews, content management, sitemap and
crawler-rendered metadata are not yet implemented. Do not treat the existing
availability endpoint as a complete public catalogue. Catalogue ordering uses
the vehicle's last update time, not publication time, which is not recorded.

The Vite application is client-rendered. Dynamic React metadata alone does not
provide reliable previews to all social crawlers. A deployment-compatible
server-rendering or pre-rendering approach needs to be selected before
claiming crawler-ready SEO.
