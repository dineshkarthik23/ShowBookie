import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 8080);

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

app.listen(PORT, () => {
  console.log(`ShowBookie is running on http://localhost:${PORT}`);
});
