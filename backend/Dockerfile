# Imagen base: Node 22 sobre Alpine Linux (una distribución mínima, ~50 MB)
FROM node:22-alpine

WORKDIR /app

# Copiamos primero SOLO los package*.json e instalamos dependencias.
# Docker guarda cada instrucción como una "capa" en caché: si no cambias las
# dependencias, esta capa se reutiliza y no se vuelve a hacer npm install.
COPY package*.json ./
RUN npm ci --omit=dev

# Ahora sí, el código fuente (cambia mucho más a menudo que las dependencias)
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

# Ejecutamos como el usuario "node" (sin privilegios) en vez de root
USER node

CMD ["node", "src/app.js"]
