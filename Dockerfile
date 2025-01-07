FROM    node:16.13 AS builder
RUN     npm install -g @pnpm/exe
WORKDIR /app
COPY    package.json .
COPY    pnpm-lock.yaml .
RUN     pnpm install

FROM    node:16.13-slim
WORKDIR /app
COPY    . .
COPY    --from=builder /app/node_modules ./node_modules
CMD     ["npx", "vitest", "run"]
