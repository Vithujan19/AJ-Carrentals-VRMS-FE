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

Public booking searches, image delivery and booking submissions require a
vehicle to be active and explicitly published. Existing vehicles default to
unpublished; authorized staff can publish them from the vehicle edit form.
Images must also be published individually. The corresponding backend
migration must be reviewed and applied before using this version.

The broader public catalogue, contact and policy pages, Google reviews,
content management, sitemap and crawler-rendered metadata are not yet
implemented. Do not treat the current availability endpoint as a complete
public catalogue.

The Vite application is client-rendered. Dynamic React metadata alone does not
provide reliable previews to all social crawlers. A deployment-compatible
server-rendering or pre-rendering approach needs to be selected before
claiming crawler-ready SEO.
