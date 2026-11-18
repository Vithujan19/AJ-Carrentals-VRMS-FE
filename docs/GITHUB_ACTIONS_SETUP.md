# GitHub Actions setup

The workflow at `.github/workflows/deploy.yml` runs CI for pull requests and
pushes to `main` and the current legacy `master` branch. Only `main` can
deploy. The current checked-out branch is `master`; move to a protected `main`
branch before enabling production deployments.

## Frontend repository settings

Add these repository or `production` environment secrets:

| Secret | Value |
|---|---|
| `FE_FTP_SERVER` | `ftp.ajcarrentals.lk` |
| `FE_FTP_PORT` | `21` |
| `FE_FTP_USERNAME` | `aj_carrentals@book.ajcarrentals.lk` |
| `FE_FTP_PASSWORD` | The rotated frontend FTP password |

Add these repository variables:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://bookapi.ajcarrentals.lk/api/v1` |
| `FE_FTP_REMOTE_DIR` | `./` unless the FTP account's document root is verified elsewhere |
| `ENABLE_PRODUCTION_DEPLOYMENT` | Leave unset or `false` until production setup and first-deploy approval are complete |

Create a `production` GitHub Environment, restrict deployments to protected
`main`, and configure required reviewers. The FTP job uses explicit FTPS on
port 21, requires certificate verification, and does not delete remote files.
It uploads only the generated `dist/` output, including the SPA fallback
`.htaccess`; it does not deploy project source or `.env` files.

## Triggers and manual deployment

- Pull requests to `main` or legacy `master`: install, run configured lint and
  test scripts when present, build, and check the production API URL. No
  deployment occurs. This project currently has no lint or test scripts.
- Pushes to `main`: validate and build; deployment additionally requires
  `ENABLE_PRODUCTION_DEPLOYMENT=true` and production environment approval.
- Manual run: select the approved `main` ref in GitHub Actions and check
  `confirm_production_deployment`. The same CI and environment approval apply.
- Pushes to legacy `master` run CI only.

Do not enable the deployment variable or approve the first production run until
the FTP directory, TLS connection, branch protection, and deployed site have
been reviewed. Never put FTP passwords in workflow files, frontend variables,
logs, or documentation.
