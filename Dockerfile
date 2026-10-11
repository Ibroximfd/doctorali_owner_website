# «Doctor Ali Nazorat» — production obraz (Next.js standalone).
# NEXT_PUBLIC_* qiymatlar build paytida kodga yoziladi — shuning uchun build-arg.
#   docker build -t doctor-ali-nazorat --build-arg NEXT_PUBLIC_API_MOCKING=0 .
#   docker run -d --restart=always -p 3000:3000 --env-file .env.production doctor-ali-nazorat

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_MOCKING=0
ARG NEXT_PUBLIC_WS_URL=
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
ARG ALLOW_SAMPLE_DATA_IN_PRODUCTION=0
ENV NEXT_PUBLIC_API_MOCKING=$NEXT_PUBLIC_API_MOCKING \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME \
    ALLOW_SAMPLE_DATA_IN_PRODUCTION=$ALLOW_SAMPLE_DATA_IN_PRODUCTION \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
CMD ["node", "server.js"]
