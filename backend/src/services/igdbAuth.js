const axios = require('axios');

// Guardo el token de Twitch en memoria para no pedir uno nuevo en cada petición
let cachedToken = null;
let tokenExpiresAt = 0; // timestamp en milisegundos

async function getAccessToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    },
  });

  const { access_token, expires_in } = response.data;

  cachedToken = access_token;
  // Resto 60 s para renovarlo antes de que caduque de verdad y no usar uno a punto de expirar
  tokenExpiresAt = now + (expires_in - 60) * 1000;

  return cachedToken;
}

module.exports = { getAccessToken };
