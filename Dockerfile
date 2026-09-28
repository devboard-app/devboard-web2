FROM node:22-alpine

# Same pnpm version as .mise.toml, so the lockfile resolves identically.
RUN corepack enable && corepack prepare pnpm@10.34.3 --activate

WORKDIR /app

# Dependencies first, so a source-only change reuses this layer.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV PORT=8443
EXPOSE 8443

# The Vite dev server, not a static build: its proxy is what gets the browser
# past the backends' missing CORS (see vite.config.ts).
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0"]
