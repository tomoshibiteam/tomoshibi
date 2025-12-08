const path = require('path');
const express = require('express');
const compression = require('compression');

const app = express();
const port = process.env.PORT || 3000;

const lpDist = path.join(__dirname, 'apps', 'city-trail-lp', 'dist');
const mobileDist = path.join(__dirname, 'apps', 'mobile', 'dist');

app.use(express.json());
app.use(compression());

// Serve mobile app under /mobile
app.use('/mobile', express.static(mobileDist, { index: false }));
// ensure both /mobile and /mobile/* return SPA entry
app.get(['/mobile', '/mobile/*'], (_req, res) => {
  res.sendFile(path.join(mobileDist, 'index.html'));
});

// Serve LP as root
app.use(express.static(lpDist, { index: false }));
app.get('*', (_req, res) => {
  res.sendFile(path.join(lpDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`Unified server running at http://localhost:${port}`);
  console.log(`- LP: http://localhost:${port}/`);
  console.log(`- Mobile app: http://localhost:${port}/mobile`);
});
