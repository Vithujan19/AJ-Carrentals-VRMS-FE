# Frontend deployment troubleshooting

| Symptom | Checks |
|---|---|
| Workflow build fails | Confirm Node.js 22, the committed lockfile, `npm ci`, and a configured `VITE_API_BASE_URL`. There are currently no lint or test scripts. |
| FTP authentication fails | Verify the frontend account secret names, account status, and that the rotated password was stored in the frontend repository/environment. Do not print the password. |
| TLS or certificate failure | Verify explicit FTPS on port 21, provider certificate validity, and system time. Do not disable certificate verification or fall back to plain FTP. |
| Permission denied or wrong destination | Inspect the account's accessible directories and verify `FE_FTP_REMOTE_DIR` points to the frontend document root. The default is `./`. |
| Homepage works but a route refresh fails | Confirm the deployed `.htaccess` exists, Apache `mod_rewrite` is available, and the account permits rewrite rules. |
| Static asset check fails | Compare the deployed `dist/assets` files and homepage references; check CDN/cache settings and permissions. |
| Frontend cannot call the API | Check the production Vite API URL, HTTPS, API availability, and backend CORS origin. Vite values are public; never add backend credentials to them. |

The workflow never deletes remote files. Diagnose and recover from a known
backup rather than enabling destructive mirroring.
