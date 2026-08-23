import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import weatherRoutes from './routes/weather.routes.js';
import historyRoutes from './routes/history.routes.js';

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/weather', weatherRoutes);
app.use('/api/history', historyRoutes);
app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(error.status || 500).json({ error: 'Something went wrong. Please try again.' });
});

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`Weather API listening on port ${port}`));
}

export default app;
