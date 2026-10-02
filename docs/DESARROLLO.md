# Guía de desarrollo diario

Cómo retomar el trabajo en el proyecto cada vez que abres el ordenador. Para la primera instalación (clonar, crear `.env`, `npm install`) consulta el [README](../README.md#puesta-en-marcha).

## Arranque rápido

Necesitas **tres terminales** (en VS Code: `` Ctrl+` `` y el botón `+`). Todos los comandos parten de la raíz del proyecto, `biblioteca-videojuegos/`.

| # | Qué | Comando | Resultado esperado |
|---|-----|---------|--------------------|
| 1 | Base de datos | `docker compose up -d` | Contenedor `biblioteca_db` en `localhost:5432` |
| 2 | Backend | `cd backend && npm run dev` | `Servidor corriendo en http://localhost:4000` |
| 3 | Frontend | `cd frontend && npm run dev` | App en http://localhost:5173 |

**El orden importa:** el backend necesita la base de datos al arrancar, y el frontend necesita el backend para funcionar.

## Paso a paso

### 1. Docker y la base de datos

Abre **Docker Desktop** (si usas WSL2) o asegúrate de que el servicio de Docker está activo. Después, desde la raíz:

```bash
docker compose up -d
```

- `up` crea y arranca el contenedor; `-d` lo deja en segundo plano (no ocupa la terminal).
- El contenedor tiene `restart: unless-stopped`, así que si no lo paraste a mano, Docker lo reinicia solo al arrancar. Entonces este paso puede ser innecesario, pero ejecutarlo no hace daño.
- Los datos se guardan en el volumen `pgdata`, así que **sobreviven** a apagar el contenedor o el ordenador.

Comprueba que está vivo:

```bash
docker compose ps
```

Debe aparecer `biblioteca_db` con estado `Up`.

### 2. Backend (Express)

```bash
cd backend
npm run dev
```

`npm run dev` usa **nodemon**, que reinicia el servidor cada vez que guardas un archivo. No hace falta volver a arrancarlo tras editar código (sí tras cambiar el `.env`: guarda cualquier archivo de `src/` o escribe `rs` en esa terminal).

Comprueba que responde y que llega a la base de datos:

```bash
curl localhost:4000/health
```

Debe devolver `{"status":"ok", ...}`. Si devuelve error de base de datos, vuelve al paso 1.

### 3. Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

Abre http://localhost:5173. Vite recarga la página al guardar (HMR).

## Resumen de puertos

| Servicio | Puerto | URL |
|----------|--------|-----|
| PostgreSQL | 5432 | `postgresql://biblioteca_user:biblioteca_pass@localhost:5432/biblioteca_db` |
| Backend | 4000 | http://localhost:4000 |
| Frontend | 5173 | http://localhost:5173 |

## Cómo apagarlo todo al terminar

| Qué | Cómo |
|-----|------|
| Frontend y backend | `Ctrl+C` en cada terminal |
| Base de datos | `docker compose stop` (conserva los datos) |

Apagar la base de datos es opcional: puede quedarse corriendo sin problema.

> ⚠️ **No uses `docker compose down -v`** salvo que quieras borrar la base de datos. La opción `-v` elimina el volumen `pgdata` y **con él todos los usuarios y juegos**. `docker compose down` (sin `-v`) solo elimina el contenedor y es seguro.

## Tareas habituales

### Mirar la base de datos con psql

```bash
docker exec -it biblioteca_db psql -U biblioteca_user -d biblioteca_db
```

Dentro de `psql`:

```sql
\dt                          -- lista las tablas
SELECT id, username FROM users;
SELECT id, user_id, name, status, rating FROM user_games;
\q                           -- salir
```

Consulta rápida sin entrar al modo interactivo:

```bash
docker exec biblioteca_db psql -U biblioteca_user -d biblioteca_db -c "SELECT * FROM users;"
```

### Crear las tablas en una base de datos vacía

Si borraste el volumen o es una máquina nueva, el contenedor arranca **sin tablas** (el `docker-compose.yml` no ejecuta el esquema automáticamente). Créalas con:

```bash
docker exec -i biblioteca_db psql -U biblioteca_user -d biblioteca_db < backend/src/models/sql/schema.sql
```

Es seguro repetirlo: el esquema usa `IF NOT EXISTS`, así que si las tablas ya existen solo muestra avisos (`NOTICE ... already exists, skipping`) y no toca los datos.

### Probar la API sin el frontend

```bash
# Registrar y entrar (guarda el token que devuelve el login)
curl -X POST localhost:4000/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"prueba","email":"prueba@example.com","password":"Test1234!"}'
curl -X POST localhost:4000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"prueba@example.com","password":"Test1234!"}'

# Usar el token en una ruta protegida
curl localhost:4000/games -H "Authorization: Bearer TU_TOKEN"
```

### Instalar dependencias

Solo hace falta si cambió `package.json` (por ejemplo tras un `git pull` o al añadir una librería):

```bash
cd backend && npm install
cd frontend && npm install
```

### Comprobar la calidad del frontend

```bash
cd frontend
npm run lint     # revisa el código con ESLint
npm run build    # comprueba que compila para producción
```

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| `Cannot connect to the Docker daemon` | Docker no está arrancado | Abre Docker Desktop y espera a que indique que está listo |
| `/health` devuelve error de base de datos | El contenedor está parado | `docker compose up -d` y `docker compose ps` |
| `EADDRINUSE: address already in use :::4000` | Ya hay un backend corriendo | Cierra la otra terminal, o localiza el proceso con `lsof -i :4000` y párelo con `kill <PID>` |
| `port is already allocated` (5432) | Hay otro Postgres usando el puerto | Para el otro Postgres, o cambia el puerto de la izquierda en `docker-compose.yml` (`"5433:5432"`) y ajusta `DATABASE_URL` |
| La app te echa al login | El token JWT caducó (dura 7 días) o es inválido | Vuelve a iniciar sesión |
| `relation "users" does not exist` | Base de datos sin tablas | Ejecuta el comando de la sección *Crear las tablas* |
| Error de IGDB / búsqueda sin resultados | Faltan o son erróneas `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` en `backend/.env` | Revisa el `.env` y reinicia el backend |
| Cambié el `.env` y no se nota | El `.env` solo se lee al arrancar | Reinicia el backend |

## Checklist de cierre de sesión

- [ ] Guardar todos los archivos
- [ ] `Ctrl+C` en las terminales de backend y frontend
- [ ] (Opcional) `docker compose stop`
- [ ] Anotar qué sigue pendiente para la próxima vez
