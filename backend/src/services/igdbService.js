const axios = require('axios');
const { getAccessToken } = require('./igdbAuth');

async function searchGames(query) {
  const accessToken = await getAccessToken();

  const response = await axios.post(
    'https://api.igdb.com/v4/games',
    `search "${query}"; fields name, cover.image_id, platforms.name, first_release_date; limit 10;`,
    {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
    }
  );

  return response.data;
}

module.exports = { searchGames };
