// server.js
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.get('/env.js', (req, res) => {
  res.type('application/javascript').send(
    `window.ENV = {
      MAPBOX_ACCESS_TOKEN: ${JSON.stringify(process.env.MAPBOX_ACCESS_TOKEN || '')},
      VECTOR_SOURCE_URL: ${JSON.stringify(process.env.VECTOR_SOURCE_URL || '')},
      COUNTY_SOURCE_URL: ${JSON.stringify(process.env.COUNTY_SOURCE_URL || '')}
    };`
  );
});

app.use(express.static('tx-map'));

app.listen(3000, () => console.log('http://localhost:3000'));