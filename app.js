import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const DEFAULT_PORT = 8080;
const REQUESTED_PORT = Number(process.env.PORT || DEFAULT_PORT);
const MAX_PORT_ATTEMPTS = process.env.PORT ? 1 : 10;

app.disable('x-powered-by');

app.use((req, res, next) => {
  if (req.path.endsWith('.webmanifest')) {
    res.type('application/manifest+json');
  }
  next();
});

app.use(express.static(__dirname, {
  extensions: ['html'],
}));

const pageAliases = {
  '/': '/html/index.html',
  '/movie.html': '/html/movie.html',
  '/list.html': '/html/list.html',
  '/movdetails.html': '/html/movdetails.html',
  '/movdetails2.html': '/html/movdetails2.html',
  '/movdetails3.html': '/html/movdetails3.html',
  '/movdetails4.html': '/html/movdetails4.html',
  '/about.html': '/html/about.html',
  '/contact.html': '/html/contact.html',
  '/bookinghist.html': '/html/bookinghist.html',
  '/profile.html': '/html/profile.html',
  '/seats.html': '/html/seats.html',
  '/payment.html': '/html/payment.html',
  '/booking.html': '/html/booking.html',
  '/help.html': '/html/help.html',
  '/faq.html': '/html/faq.html',
  '/admin.html': '/html/admin.html',
  '/terms.html': '/html/terms.html',
  '/privacy.html': '/html/privacy.html',
  '/cancellation.html': '/html/cancellation.html',
  '/summa.html': '/html/summa.html',
};

Object.entries(pageAliases).forEach(([routePath, filePath]) => {
  app.get(routePath, (req, res) => {
    res.sendFile(path.join(__dirname, filePath));
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'ShowBookie', mode: 'static-mock' });
});

app.get('/logout', (_req, res) => {
  res.redirect('/html/index.html');
});

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, '/offline.html'));
});

function startServer(port, attemptsLeft) {
  const server = app.listen(port, () => {
    console.log(`ShowBookie is running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 1) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use. Retrying on ${nextPort}...`);
      startServer(nextPort, attemptsLeft - 1);
      return;
    }

    if (error.code === 'EADDRINUSE') {
      console.error(`Unable to start ShowBookie: port ${port} is already in use.`);
      console.error('Set a free port with PORT=<port> and try again.');
      process.exit(1);
      return;
    }

    console.error('Unable to start ShowBookie:', error);
    process.exit(1);
  });
}

startServer(REQUESTED_PORT, MAX_PORT_ATTEMPTS);
