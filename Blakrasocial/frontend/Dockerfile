# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_PROFILE_KEY_CLAIM=profile_key
ARG VITE_CONTACT_EMAIL=
ARG VITE_COMPANY_NAME=Blakra
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_PROFILE_KEY_CLAIM=$VITE_PROFILE_KEY_CLAIM \
    VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL VITE_COMPANY_NAME=$VITE_COMPANY_NAME
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
