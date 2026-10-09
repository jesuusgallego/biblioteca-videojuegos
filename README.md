# GameHub

Aplicación web para registrarte, iniciar sesión, buscar videojuegos y gestionar tu biblioteca personal (estado, puntuación y reseña). El frontend aún no usa el CRUD de la biblioteca: de momento solo está la búsqueda. Los datos de juegos se consultan a la API de IGDB (Twitch).

## Stack

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 19, React Router 7, Vite 8, ESLint |
| Backend | Node.js, Express 5, JWT, bcrypt, axios, pg |
| Base de datos | PostgreSQL 16 (Docker) |
| Despliegue | Docker Compose (nginx sirve el frontend) |

## Estructura

```
biblioteca-videojuegos/
├── docker-compose.yml   # PostgreSQL + backend + frontend
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
- Opcional: una clave de Azure AI Translator (`AZURE_TRANSLATOR_KEY` y `AZURE_TRANSLATOR_REGION`) para mejorar la traducción de las descripciones

## Puesta en marcha

> ¿Ya lo tienes instalado y solo quieres retomar el trabajo? Ve a la [guía de desarrollo diario](docs/DESARROLLO.md). Lo de abajo es la **primera instalación**.

### 1. Base de datos

```bash
docker compose up -d postgres traductor
```

Levanta PostgreSQL en `localhost:5432` con usuario `biblioteca_user`, contraseña `biblioteca_pass` y base de datos `biblioteca_db` (datos persistidos en el volumen `pgdata`), y el traductor en `localhost:5000`.

Las descripciones de los juegos, que IGDB solo da en inglés, se traducen al español con **dos traductores**:

1. **[Azure AI Translator](https://azure.microsoft.com/products/ai-services/ai-translator)** (opcional, mejor calidad): si defines `AZURE_TRANSLATOR_KEY` en `backend/.env`, se usa primero. Su plan gratuito (F0) da 2 millones de caracteres al mes. La app se pone un tope propio de **1,9 millones al mes** (`AZURE_TRANSLATOR_LIMITE_MENSUAL`): cuenta en la base de datos (tabla `translation_usage`) los caracteres que envía y, al llegar al tope, deja de usar Azure hasta el mes siguiente, para no depender de lo que haga Microsoft al pasarse del límite.
2. **[LibreTranslate](https://github.com/LibreTranslate/LibreTranslate)** (el contenedor `traductor`): corre en local, sin cuenta ni claves. Es la reserva cuando no hay clave de Azure, se alcanza el tope o Azure falla. La primera vez descarga los modelos de traducción (tarda unos minutos; se guardan en el volumen `lt_models`) y ocupa cerca de 1 GB de RAM.

Si no hay ninguno de los dos, las descripciones salen en inglés. Cada traducción se guarda en la base de datos (tabla `translations`), así que no se repite ni vuelve a gastar caracteres; si una estaba hecha con LibreTranslate y luego pones la clave de Azure, se rehace con Azure una vez. Para ver cuánto llevas gastado este mes:

```bash
docker exec biblioteca_db psql -U biblioteca_user -d biblioteca_db -c "SELECT * FROM translation_usage;"
```

### 2. Backend

Crea `backend/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://biblioteca_user:biblioteca_pass@localhost:5432/biblioteca_db
JWT_SECRET=una_clave_larga_y_secreta
TWITCH_CLIENT_ID=tu_client_id
TWITCH_CLIENT_SECRET=tu_client_secret
# Opcional: traducción de calidad con Azure Translator (sin ella se usa LibreTranslate)
# AZURE_TRANSLATOR_KEY=tu_clave
# AZURE_TRANSLATOR_REGION=westeurope
# AZURE_TRANSLATOR_LIMITE_MENSUAL=1900000
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

## Ejecutar todo con Docker

Alternativa a la puesta en marcha manual: un solo comando levanta base de datos, backend y frontend. Solo necesitas `backend/.env` (el `DATABASE_URL` se sobrescribe dentro de Docker).

```bash
docker compose up -d --build
```

- Frontend: http://localhost:5173 (nginx)
- Backend: http://localhost:4000
- Traductor (LibreTranslate): http://localhost:5000
- Las tablas se crean solas la primera vez (`schema.sql` se monta en `/docker-entrypoint-initdb.d`). Si ya tenías el volumen `pgdata` creado, no se vuelve a ejecutar.
- Para pararlo: `docker compose down` (añade `-v` solo si quieres borrar los datos).
- Si cambias `VITE_API_URL`, reconstruye el frontend: la URL se incrusta al compilar (`docker compose build --build-arg VITE_API_URL=... frontend`).

## API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Comprueba servidor y conexión a la base de datos |
| POST | `/auth/register` | No | Crea un usuario |
| POST | `/auth/login` | No | Inicia sesión y devuelve un token JWT |
| GET | `/auth/me` | Bearer token | Devuelve el usuario del token |
| GET | `/games/search?q=<nombre>` | Bearer token | Busca juegos por nombre en IGDB |
| GET | `/games/details/:igdbId?lang=es` | Bearer token | Ficha completa de un juego desde IGDB: descripción (con `lang=es` se traduce al español con Azure Translator o, si no está disponible, con LibreTranslate, y se guarda en la tabla `translations`; si no responde ninguno, sale en inglés y `summary_lang` vale `en`), fecha de lanzamiento, desarrolladora, publishers, géneros, plataformas, nota, capturas (caché de 1 hora en memoria) |
| GET | `/games/artworks` | Bearer token | Ilustraciones oficiales (artworks) de IGDB de los juegos de tu biblioteca, agrupadas por juego (máx. 12 por juego, caché de 1 hora en memoria). Sirven para elegir la foto de perfil |
| POST | `/games` | Bearer token | Añade un juego a tu biblioteca (`igdb_id` y `name` obligatorios; 409 si ya lo tienes) |
| GET | `/games` | Bearer token | Lista los juegos de tu biblioteca |
| PATCH | `/games/:id` | Bearer token | Actualiza `status`, `rating`, `review` o `platform`. Los campos omitidos no cambian; enviar `null` borra `rating`, `review` o `platform` |
| DELETE | `/games/:id` | Bearer token | Elimina un juego de tu biblioteca |
| GET | `/profile` | Bearer token | Tus datos: usuario, email, bio, foto y fecha de alta |
| GET | `/profile/stats` | Bearer token | Estadísticas de tu biblioteca (juegos por estado, nota media) y tus 5 juegos mejor valorados |
| PATCH | `/profile` | Bearer token | Cambia `username`, `bio` y/o `avatar` (data URL JPG/PNG/WebP; `null` borra bio o foto). 409 si el usuario ya existe |
| PATCH | `/profile/email` | Bearer token | Cambia el email (`email` + `current_password`). 403 si la contraseña es incorrecta |
| PATCH | `/profile/password` | Bearer token | Cambia la contraseña (`current_password` + `new_password`) |
| DELETE | `/profile` | Bearer token | Borra tu cuenta y toda tu biblioteca (`password`) |

`status` admite `jugando`, `completado`, `abandonado` y `pendiente`; `rating` va de 1 a 10.

## Scripts

**Backend:** `npm run dev`, `npm start`
**Frontend:** `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`

## Notas

- Todas las llamadas al backend pasan por `frontend/src/api.js` (`apiFetch`). La URL base es `http://localhost:4000` por defecto; para otro host define `VITE_API_URL` en `frontend/.env`.
- La columna `user_games.igdb_id` guarda el ID del juego en **IGDB**.
- El token JWT se guarda en `localStorage`.
- La foto de perfil se guarda como texto (data URL en base64) en `users.avatar`; el navegador la recorta en cuadrado y la reduce a 256 px antes de enviarla. Puede ser una foto subida o una ilustración de IGDB de un juego de tu biblioteca: en el segundo caso el navegador descarga la ilustración (IGDB permite leer sus imágenes desde otras webs), te deja ajustar el encuadre y guarda el recorte, igual que una foto subida; el backend no guarda ninguna URL de IGDB como avatar. Si tu base de datos es anterior al perfil, añade las columnas con `docker exec -i biblioteca_db psql -U biblioteca_user -d biblioteca_db -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT; ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(300);"` (o vuelve a ejecutar `schema.sql`, que es idempotente).
- Las credenciales de `docker-compose.yml` son solo para desarrollo; cámbialas en cualquier otro entorno.
- `backend/.env` contiene secretos: asegúrate de que esté en `.gitignore`.
