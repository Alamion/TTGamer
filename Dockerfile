# The site as a static image (T-118): Node builds it, nginx serves build/. See deploy/AGENTS.md.

FROM node:22.22-bookworm-slim AS build
WORKDIR /app
COPY package.json yarn.lock ./
# `prepare` installs git hooks and builds translations from sources not copied yet; the build
# runs the translations again.
RUN yarn install --frozen-lockfile --ignore-scripts --network-timeout 600000
COPY . .
# Canonical address for links, sitemap, and social cards; empty keeps docusaurus.config.ts's.
ARG SITE_URL=
RUN SITE_URL="$SITE_URL" yarn build

FROM nginxinc/nginx-unprivileged:1.29-alpine
ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="ttgamer-web" \
      org.opencontainers.image.source="https://github.com/Alamion/TTGamer" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$REVISION"
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/headers.conf /etc/nginx/snippets/headers.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
