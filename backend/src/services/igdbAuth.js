const axios = require('axios');

let cachedToken = null;
let tokenExpiresAt = 0; // timestamp en milisegundos

async function getAccessToken() {
  const now = Date.now();

  // Si tenemos un token en caché y todavía no ha caducado, lo reutilizamos
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  // Si no, pedimos uno nuevo a Twitch
  const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    },
  });

  const { access_token, expires_in } = response.data;

  cachedToken = access_token;
  // Restamos un margen de seguridad (60s) para renovar un poco antes de que caduque de verdad
  tokenExpiresAt = now + (expires_in - 60) * 1000;

  return cachedToken;
}

module.exports = { getAccessToken };
