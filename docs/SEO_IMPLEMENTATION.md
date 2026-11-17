# SEO implementation status

The current frontend is a Vite client-rendered application. The public home
page has a static document title, but page-specific metadata, canonical URLs,
structured data, sitemap generation and robots rules are not implemented.
Social crawlers may not execute client JavaScript and therefore may not see
vehicle-specific content or previews.

Before public launch, choose a hosting-compatible approach for serving
indexable HTML and metadata for each public page and vehicle. Static
pre-rendering can cover stable marketing pages; dynamic vehicle pages need
server rendering or a build and refresh strategy that tracks published inventory.
Private staff routes must remain outside the sitemap. Validate crawlability,
canonical URLs, accessibility and Core Web Vitals against the deployed site.
