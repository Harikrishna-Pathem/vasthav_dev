FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
RUN corepack enable && pnpm install --filter @vasthav/backend... --frozen-lockfile=false
COPY . .
RUN pnpm --filter @vasthav/backend prisma:generate && pnpm --filter @vasthav/backend build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
