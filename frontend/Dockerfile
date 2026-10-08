# ---- Etapa 1: construir la web (necesita Node, pero la imagen final NO) ----
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Vite "hornea" las variables VITE_* dentro del JavaScript al compilar, así que
# la URL de la API debe conocerse en el build, no al arrancar el contenedor.
# Es la URL que usará el NAVEGADOR (por eso es localhost:4000 y no "backend").
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Etapa 2: servir los archivos estáticos con nginx ----
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
