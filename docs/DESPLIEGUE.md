# Desplegar el servidor (backend + base de datos)

La app de escritorio **no lleva servidor dentro**: llama por internet a un backend que
tú alojas. Esta guía deja el backend funcionando **gratis y sin tarjeta**, con:

- **Render** para el servidor (plan gratuito).
- **Neon** para la base de datos PostgreSQL (plan gratuito).

```
 App de escritorio (Electron)  ──https──▶  Render (backend)  ──▶  Neon (PostgreSQL)
   en el PC de cada usuario                                  │
                                                             ├──▶ IGDB / Twitch   (datos de los juegos)
                                                             ├──▶ Steam Web API   (horas y logros)
                                                             └──▶ Azure Translator (opcional)
```

Las claves de IGDB y de Steam viven **solo** en el servidor. Si fueran dentro del
instalador, cualquiera podría extraerlas.

> **Cómo se porta el plan gratuito.** Render duerme el servidor tras 15 minutos sin
> peticiones y la primera que llega tarda hasta un minuto en despertarlo; Neon suspende
> la base de datos a los 5 minutos y la despierta sola. La app lo avisa con un mensaje
> ("El servidor está tardando en responder…"). Los datos no se pierden.

Los límites de los planes gratuitos cambian: confírmalos en
[render.com/docs/free](https://render.com/docs/free) y en
[neon.com/docs/introduction/plans](https://neon.com/docs/introduction/plans).

## 1. La base de datos en Neon

1. Entra en [neon.com](https://neon.com) y crea la cuenta (GitHub, Google o correo; no pide tarjeta).
2. **Create project**: nombre `gamehub`, región **AWS Europe (Frankfurt)** (la misma que usa
   `render.yaml`, para que servidor y base de datos estén cerca).
3. Pulsa **Connect** y copia la cadena de conexión. Es parecida a:

   ```
   postgresql://usuario:clave@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   Es un secreto: no la subas a git ni la pegues en chats públicos.

No hay que crear tablas: el backend ejecuta `schema.sql` solo al arrancar.

## 2. El servidor en Render

1. Entra en [render.com](https://render.com) con tu cuenta de GitHub y dale acceso al
   repositorio `biblioteca-videojuegos`.
2. **New → Blueprint** y elige el repositorio. Render lee [`render.yaml`](../render.yaml) y
   propone el servicio `gamehub-api`.
3. Te pide los valores de las variables que no están en el repositorio:

   | Variable | De dónde sale |
   |----------|---------------|
   | `DATABASE_URL` | La cadena de conexión de Neon (paso 1) |
   | `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` | Tu aplicación en https://dev.twitch.tv/console |
   | `STEAM_API_KEY` | https://steamcommunity.com/dev/apikey |

   `JWT_SECRET` lo genera Render solo. `NODE_ENV`, `TRUST_PROXY` y `CORS_ORIGINS` ya vienen
   puestos en `render.yaml`.
4. **Apply**. La primera vez construye la imagen de Docker (unos minutos).
5. Cuando termine, Render te da una dirección tipo `https://gamehub-api.onrender.com`.
   Comprueba `https://gamehub-api.onrender.com/health`: debe responder `{"status":"ok", ...}`.
   La primera visita puede tardar hasta un minuto.

### Si algo falla

Mira **Logs** en Render:

| Mensaje | Qué pasa |
|---------|----------|
| `No se pudo preparar la base de datos` | `DATABASE_URL` mal copiada. Si trae `&channel_binding=require` al final, quítalo |
| `Falta JWT_SECRET` | La variable no se creó: añádela a mano con 32+ caracteres aleatorios |
| La página tarda y luego `502` | Está despertando: espera un minuto y recarga |

### Variables opcionales (en Render → Environment)

| Variable | Para qué |
|----------|----------|
| `AZURE_TRANSLATOR_KEY` y `AZURE_TRANSLATOR_REGION` | Traducir las descripciones al español (plan gratuito F0: 2 millones de caracteres al mes). Sin ellas, salen en inglés. **No las pongas vacías ni inventadas.** |
| `STEAM_SYNC_MINUTOS` | Cada cuántos minutos se sincroniza Steam solo (60 por defecto) |

## 3. Apuntar la app al servidor

La dirección del servidor se **graba** en la app al compilarla. En GitHub:
*Settings → Secrets and variables → Actions → Variables → New repository variable*:

```
GAMEHUB_API_URL = https://gamehub-api.onrender.com
```

(sin barra al final). Sigue con [`desktop/README.md`](../desktop/README.md) para generar el
instalador.

## Qué protege ya el backend

- **Límite de intentos:** 10 inicios de sesión fallidos cada 15 minutos por IP, 10 registros
  por hora y 1000 peticiones cada 15 minutos en total. Responde `429`.
- **Cabeceras de seguridad** (`helmet`) y **CORS** restringido a `CORS_ORIGINS`.
- **Contraseñas** con bcrypt y sesiones con JWT de 7 días.
- **Arranque seguro:** sin `JWT_SECRET` (o demasiado corto en producción) no arranca.
- **Proceso sin privilegios** dentro del contenedor (usuario `node`).

## Límites y cosas a vigilar

- **No lo mantengas despierto con pings.** Parece buena idea, pero la sincronización de Steam
  consulta la base de datos cada pocos minutos: con el servidor siempre despierto, Neon no se
  suspendería y gastaría sus horas de cómputo gratuitas mucho antes de acabar el mes.
- **Sin servidor despierto, no hay sincronización automática de Steam en segundo plano.** Se
  sincroniza al abrir el perfil (y el servidor se despierta con esa petición).
- **Steam:** una sola clave tiene un tope de **100.000 consultas al día para todos los
  usuarios**. Cada sincronización gasta una por juego jugado. Con muchos usuarios y
  bibliotecas grandes hay que subir `STEAM_SYNC_MINUTOS`.
- **IGDB:** 4 peticiones por segundo en total. La app cachea las fichas una hora y guarda
  género y compañías en la BD, así que el uso normal queda muy por debajo.
- **No hay recuperación de contraseña:** quien la olvide, pierde la cuenta (no hay envío
  de correos). Está anotado como limitación de la 1.0.
- **Copias de seguridad:** Neon guarda un historial corto para restaurar. Para una copia
  tuya: `pg_dump "$DATABASE_URL" > copia.sql`.
- **Una sola instancia:** la sincronización de Steam y la caché de IGDB viven en la memoria
  del proceso. El plan gratuito ya es una sola instancia; no la escales a varias sin antes
  mover eso a la base de datos.

## Cambiar de proveedor más adelante

El backend es una imagen de Docker estándar (`backend/Dockerfile`) y la base de datos es
PostgreSQL normal: sirve igual en Google Cloud Run, un VPS u otro servicio. Solo cambian
las variables y la `GAMEHUB_API_URL` con la que se compila la app.
