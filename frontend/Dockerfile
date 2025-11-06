FROM node:22-bullseye AS build

WORKDIR /app

# copy frontend sources and restore dependencies
COPY frontend/package*.json ./
COPY frontend/ ./

RUN npm ci --silent
RUN npm run build

# Production image: serve built files with nginx
FROM nginx:stable-alpine

# Remove default site and copy built app
RUN rm /etc/nginx/conf.d/default.conf || true
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config (frontend/nginx.conf should be included in frontend/ at build time)
COPY frontend/nginx.conf /etc/nginx/conf.d/zkp.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
