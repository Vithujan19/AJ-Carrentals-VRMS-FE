# Google reviews integration status

Google review retrieval and display are not implemented. The public site does
not display review scores, review counts or testimonials.

Before implementation the business must identify its genuine Google Business
Profile or Place ID, decide how reviews may be displayed, and verify the
current Google API terms, attribution requirements, quotas and costs.
Credentials must remain on the backend, not in Vite environment variables or
browser code. Any integration should use server-side caching and fail without
breaking the rest of the website.
