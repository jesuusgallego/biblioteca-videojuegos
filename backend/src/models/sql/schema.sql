CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- solo el hash de bcrypt, nunca la contraseña
    avatar TEXT, -- foto de perfil como data URL (data:image/jpeg;base64,...); NULL = sin foto
    bio VARCHAR(300), -- descripción corta del perfil
    created_at TIMESTAMP DEFAULT NOW()
);

-- Para una BD creada antes de existir el perfil: CREATE TABLE IF NOT EXISTS no
-- toca una tabla que ya existe, así que añado las columnas aparte. En una BD
-- nueva estas dos líneas no hacen nada (las columnas ya están).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(300);

-- Cada fila es un juego en la biblioteca de un usuario.
-- Con ON DELETE CASCADE, si borro al usuario se borran también sus juegos.
CREATE TABLE IF NOT EXISTS user_games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- ID del juego en IGDB (no es el id de esta tabla)
    igdb_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    cover_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (status IN ('jugando', 'completado', 'abandonado', 'pendiente')),
    rating INTEGER CHECK (rating BETWEEN 1 AND 10),
    review TEXT,
    platform VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Un usuario no puede tener el mismo juego dos veces (el controlador lo devuelve como 409)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_game_unique
    ON user_games (user_id, igdb_id);

-- Caché de traducciones automáticas (las descripciones de IGDB vienen en inglés).
-- Traducir con LibreTranslate tarda unos segundos, así que cada texto se traduce
-- una sola vez por idioma y se guarda. La clave es el SHA-256 del texto original
-- (más corto y rápido de comparar que el texto) y el idioma de destino.
CREATE TABLE IF NOT EXISTS translations (
    text_hash CHAR(64) NOT NULL,
    target VARCHAR(5) NOT NULL,
    translated_text TEXT NOT NULL,
    -- Quién tradujo: 'azure' o 'libretranslate'. Si una traducción es de
    -- LibreTranslate y luego hay clave de Azure, se rehace con Azure (más calidad).
    provider VARCHAR(20) NOT NULL DEFAULT 'libretranslate',
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (text_hash, target)
);

-- Para una BD creada antes de existir Azure (la tabla ya existe sin esta columna)
ALTER TABLE translations ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'libretranslate';

-- Cuántos caracteres se han enviado a un traductor externo cada mes. El plan
-- gratuito de Azure Translator da 2 millones al mes; la app se pone un tope propio
-- por debajo y, al llegar, deja de usarlo hasta el mes siguiente. Así nunca
-- depende de lo que haga Microsoft al pasarse del límite.
CREATE TABLE IF NOT EXISTS translation_usage (
    provider VARCHAR(20) NOT NULL,
    month CHAR(7) NOT NULL, -- 'AAAA-MM' (UTC)
    characters INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (provider, month)
);

-- Cuentas de otras plataformas vinculadas a un usuario (de momento solo Steam).
-- external_id es el id de la cuenta en esa plataforma (para Steam, el SteamID de
-- 17 dígitos). Es un dato público, no una credencial: Steam se consulta con la
-- clave de API de la propia app, así que no guardo ninguna contraseña ni token.
-- UNIQUE (user_id, platform): un usuario solo puede tener una cuenta por plataforma.
CREATE TABLE IF NOT EXISTS linked_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    external_id VARCHAR(64) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    profile_url VARCHAR(500),
    -- TIMESTAMPTZ guarda el instante exacto (el frontend lo enseña con hora, y así no
    -- depende de la zona horaria del servidor). NULL = vinculada pero sin sincronizar.
    last_sync_at TIMESTAMPTZ,
    -- Si al vincular se eligió "añadir también los juegos que me falten". Se decide
    -- solo al vincular; sincronizar lo respeta y desvincular borra lo importado.
    import_games BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, platform)
);

-- Para una BD creada antes de existir esta columna (CREATE TABLE IF NOT EXISTS no
-- toca una tabla que ya existe)
ALTER TABLE linked_accounts ADD COLUMN IF NOT EXISTS import_games BOOLEAN NOT NULL DEFAULT FALSE;

-- Progreso traído de Steam. Todo es NULL en los juegos que no vienen de Steam.
--  - steam_appid: id del juego en Steam (distinto del igdb_id)
--  - playtime_minutes: tiempo jugado
--  - achievements_*: logros desbloqueados y totales. Total 0 = el juego no tiene
--    logros; NULL = todavía no se han consultado.
-- Igual que con avatar y bio: CREATE TABLE IF NOT EXISTS no toca una tabla que ya
-- existe, así que las columnas se añaden aparte (en una BD nueva no hacen nada).
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS steam_appid INTEGER;
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS playtime_minutes INTEGER;
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS achievements_unlocked INTEGER;
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS achievements_total INTEGER;

-- De dónde viene un juego: 'steam' si lo añadió la importación de Steam, NULL si lo
-- añadió el usuario. Sirve para que, al desvincular la cuenta, se borre lo importado
-- y la biblioteca vuelva a quedar como antes de vincularla.
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS imported_from VARCHAR(20);
