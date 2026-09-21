# Matches the container shape Quantinnel's other services already deploy with
# (Docker -> K8s per the Group 1 implementation playbook) so this ships through
# the same CI/CD pipeline rather than a bespoke one.

FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
