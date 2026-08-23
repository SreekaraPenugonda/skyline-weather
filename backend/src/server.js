import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import weatherRoutes from './routes/weather.routes.js';
import historyRoutes from './routes/history.routes.js';

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/weather', weatherRoutes);
app.use('/api/history', historyRoutes);
app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(error.status || 500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(port, () => console.log(`Weather API listening on http://localhost:${port}`));
