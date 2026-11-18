# LankaHost frontend FTPS deployment

The frontend workflow uses explicit FTPS to `ftp.ajcarrentals.lk:21` with
certificate verification and protected data transfers. It uses only the
frontend account; its username is `aj_carrentals@book.ajcarrentals.lk`.
Configure its password as the `FE_FTP_PASSWORD` GitHub Actions secret.

`FE_FTP_REMOTE_DIR` defaults to `./`, interpreted relative to the FTP
account's accessible root. Confirm with the provider or an authorized FTP
directory listing that this root is the `book.ajcarrentals.lk` document root
before enabling deployment. Do not guess or broaden the path.

The workflow builds with Node.js 22 and uploads only Vite's `dist/` output.
`public/.htaccess` supplies the Apache history fallback required by
React Router's `BrowserRouter`; confirm the hosting account supports
`.htaccess` and `mod_rewrite`. There is no existing host-specific configuration
to preserve.

Remote synchronization is non-destructive: no `mirror --delete` is used.
The workflow cannot remove unknown files from the FTP account. FTP secret
values and passwords must not be written to files or printed in logs.
