# Frontend deployment runbook

## Before the first deployment

1. Protect `main` with reviewed pull requests and required CI.
2. Configure the `production` environment with `main` as its allowed branch
   and required reviewers.
3. Add the secrets and variables listed in
   [GitHub Actions setup](./GITHUB_ACTIONS_SETUP.md).
4. Verify the FTPS account root is the frontend document root and that
   `.htaccess`/`mod_rewrite` are supported.
5. Keep `ENABLE_PRODUCTION_DEPLOYMENT` unset until the first deployment has
   explicit approval.

## Deploy and verify

- Merge a reviewed change to `main`, or dispatch the workflow on `main` with
  its confirmation input selected. Production environment approval is still
  required.
- CI builds the production Vite output with `VITE_API_BASE_URL`; deployment
  transfers only `dist/` over certificate-verified explicit FTPS.
- The workflow checks the HTTPS homepage, generated JS/CSS assets, and direct
  navigation to `/book`. A failed check fails the deployment and leaves files
  in place for investigation.
- If health checks fail, inspect sanitized workflow output, FTP path and
  hosting configuration. Restore a previous frontend release manually from
  the hosting backup; the workflow never deletes or automatically rolls back
  remote files.

No production deployment has been run by this change.
