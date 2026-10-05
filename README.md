# Biblioteca de Videojuegos

Aplicación web para registrarte, iniciar sesión, buscar videojuegos y gestionar tu biblioteca personal (estado, puntuación y reseña). El frontend aún no usa el CRUD de la biblioteca: de momento solo está la búsqueda. Los datos de juegos se consultan a la API de IGDB (Twitch).

## Stack

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 19, React Router 7, Vite 8, ESLint |
| Backend | Node.js, Express 5, JWT, bcrypt, axios, pg |
| Base de datos | PostgreSQL 16 (Docker) |

## Estructura

```
biblioteca-videojuegos/
├── docker-compose.yml   # PostgreSQL
├── docs/
│   └── DESARROLLO.md    # Cómo retomar el trabajo cada día
├── backend/
│   ├── .env             # Variables de entorno (no subir a git)
│   └── src/app.js       # Servidor Express
└── frontend/
    └── src/
        ├── App.jsx            # Rutas
        ├── Login.jsx
        ├── Registro.jsx
        ├── Biblioteca.jsx     # Búsqueda de juegos
        ├── GameCard.jsx
        └── RutaProtegida.jsx  # Requiere token para acceder
```

## Requisitos

- Node.js 20+ y npm
- Docker y Docker Compose
- Credenciales de la API de Twitch/IGDB (`TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET`)

## Puesta en marcha

> ¿Ya lo tienes instalado y solo quieres retomar el trabajo? Ve a la [guía de desarrollo diario](docs/DESARROLLO.md). Lo de abajo es la **primera instalación**.

### 1. Base de datos

```bash
docker compose up -d
```

Levanta PostgreSQL en `localhost:5432` con usuario `biblioteca_user`, contraseña `biblioteca_pass` y base de datos `biblioteca_db` (datos persistidos en el volumen `pgdata`).

### 2. Backend

Crea `backend/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://biblioteca_user:biblioteca_pass@localhost:5432/biblioteca_db
JWT_SECRET=una_clave_larga_y_secreta
TWITCH_CLIENT_ID=tu_client_id
TWITCH_CLIENT_SECRET=tu_client_secret
```

```bash
cd backend
npm install
npm run dev     # con nodemon; usa `npm start` para producción
```

Disponible en http://localhost:4000.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en http://localhost:5173 (puerto por defecto de Vite).

## API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Comprueba servidor y conexión a la base de datos |
| POST | `/auth/register` | No | Crea un usuario |
| POST | `/auth/login` | No | Inicia sesión y devuelve un token JWT |
| GET | `/auth/me` | Bearer token | Devuelve el usuario del token |
| GET | `/games/search?q=<nombre>` | Bearer token | Busca juegos por nombre en IGDB |
| POST | `/games` | Bearer token | Añade un juego a tu biblioteca (`igdb_id` y `name` obligatorios; 409 si ya lo tienes) |
| GET | `/games` | Bearer token | Lista los juegos de tu biblioteca |
| PATCH | `/games/:id` | Bearer token | Actualiza `status`, `rating`, `review` o `platform`. Los campos omitidos no cambian; enviar `null` borra `rating`, `review` o `platform` |
| DELETE | `/games/:id` | Bearer token | Elimina un juego de tu biblioteca |

`status` admite `jugando`, `completado`, `abandonado` y `pendiente`; `rating` va de 1 a 10.

## Scripts

**Backend:** `npm run dev`, `npm start`
**Frontend:** `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`

## Notas

- Todas las llamadas al backend pasan por `frontend/src/api.js` (`apiFetch`). La URL base es `http://localhost:4000` por defecto; para otro host define `VITE_API_URL` en `frontend/.env`.
- La columna `user_games.igdb_id` guarda el ID del juego en **IGDB**.
- El token JWT se guarda en `localStorage`.
- Las credenciales de `docker-compose.yml` son solo para desarrollo; cámbialas en cualquier otro entorno.
- `backend/.env` contiene secretos: asegúrate de que esté en `.gitignore`.
