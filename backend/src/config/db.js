const { Pool, types } = require('pg');
require('dotenv').config();

// Por defecto pg convierte una columna DATE en un Date de JavaScript a medianoche
// de la zona horaria del servidor, y al pasarla a JSON ("2019-09-09T22:00:00.000Z")
// el día puede cambiar. La dejo como texto "2019-09-10", que es lo que quiero.
// 1082 es el identificador de tipo DATE en Postgres.
types.setTypeParser(1082, (valor) => valor);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
