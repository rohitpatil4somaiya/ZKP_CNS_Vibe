FROM node:22-bullseye
WORKDIR /app
COPY package*.json ./
# Use npm install when no lockfile is present; omit dev deps for production image
# `npm ci` requires a package-lock.json. If you maintain a lockfile, switch back to `npm ci`.
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
ENV PORT=5050
EXPOSE 5050
CMD ["sh","-lc","node ./server.js"]