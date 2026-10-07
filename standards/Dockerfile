# Static build of the standards page, served in the tailnet as standards.pleasance.org.
# Build from the repo root: docker build -f standards/Dockerfile .
FROM oven/bun:1-slim AS build
WORKDIR /app
COPY DESIGN.md ./
COPY packages/shared/src/band.ts packages/shared/src/
COPY apps/web/static apps/web/static
COPY standards standards
RUN bun build standards/index.html --outdir dist --minify

FROM nginxinc/nginx-unprivileged:1.30.5-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
