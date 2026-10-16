# Deploy: the Site as a Docker Image

The site ships two ways: Vercel builds it from the repository (unchanged), and the `Dockerfile` at
the root builds `ttgamer-web`, one container of the Docker stack the backend runs in (T-118).

## Pieces

| File                 | Role                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| `../Dockerfile`      | Node stage runs `yarn build` (with its validators); nginx serves `build/` |
| `../.dockerignore`   | Keeps `node_modules`, builds, reports, `context/`, and `.git` out         |
| `nginx/default.conf` | Static site on `:8080`, `/healthz`, caching, gzip, per-locale 404 pages   |
| `nginx/headers.conf` | Security headers, included in every location                              |
| `Caddyfile`          | Edge proxy: TLS, `/api` and `/api/*` to the backend, the rest to `web`    |
| `compose.yaml`       | `web` + `edge`; the backend adds its `api` service                        |

- The web image knows nothing about TLS or the backend, so any proxy can front it. It runs as a
  non-root user and has a `HEALTHCHECK`.
- Directories are served without a trailing-slash redirect (`$uri/index.html`), as on Vercel.
- Bundles under `/assets/` are content-hashed and cached for a year; everything else revalidates.
- `/api` keeps its prefix on the way to the backend: the contract's server is `/api/v1`.

## Variables

| Variable       | Where         | Default                              | Meaning                                       |
| -------------- | ------------- | ------------------------------------ | --------------------------------------------- |
| `SITE_URL`     | build arg     | `https://ttgamer.vercel.app`         | Canonical address in links and the sitemap    |
| `VERSION`      | build arg     | `dev`                                | `org.opencontainers.image.version` label      |
| `REVISION`     | build arg     | `unknown`                            | `org.opencontainers.image.revision` (commit)  |
| `WEB_IMAGE`    | compose       | `ghcr.io/alamion/ttgamer-web:latest` | The image `web` runs                          |
| `SITE_ADDRESS` | compose, edge | `localhost`                          | Domain (Let's Encrypt), `localhost`, or `:80` |
| `API_UPSTREAM` | compose, edge | `api:8000`                           | Backend `host:port` inside the stack          |
| `HTTP_PORT`    | compose       | `80`                                 | Host port for HTTP                            |
| `HTTPS_PORT`   | compose       | `443`                                | Host port for HTTPS (TCP and HTTP/3 UDP)      |

`SITE_URL` is baked in at build time: an image for another domain is a separate build. A runtime
setting (for example the API address) belongs in a file the container writes at start, not in a
build argument.

## Running

```sh
docker compose -f deploy/compose.yaml up -d --build          # https://localhost
SITE_ADDRESS=:80 docker compose -f deploy/compose.yaml up -d # plain HTTP behind another proxy
```

Without an `api` service, `/api` answers 502. The backend joins with its own compose file
(`-f deploy/compose.yaml -f backend.yaml`) that defines `api`, or sets `API_UPSTREAM`. The Caddyfile
mount carries `:z` for SELinux hosts; elsewhere the flag does nothing.

## Checking

`yarn ci:docker` builds the image and runs the browser smoke tests against the container
(`E2E_IMAGE` switches the Playwright web server to `docker run`). Run it after changing any file
above or the build itself; CI runs it on every push.

## Registry and Tags

Images go to GHCR as `ghcr.io/alamion/ttgamer-web`; pushing waits for the Jenkins (or Actions) job.

| Build of               | Tags                         |
| ---------------------- | ---------------------------- |
| `testing` or `master`  | `sha-<7 hex>` (immutable)    |
| `testing`              | `testing`                    |
| `master` after a merge | `X.Y.Z`, `X.Y`, `latest`     |
| feature branches       | none: built and checked only |

Deployments pin `X.Y.Z` or `sha-…`, never `latest`, so a rollback is one tag. `VERSION` comes from
`package.json` and `REVISION` from the commit.
