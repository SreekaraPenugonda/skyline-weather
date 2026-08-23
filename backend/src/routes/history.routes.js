import { Router } from 'express';
import { deleteHistory, listHistory, saveHistory } from '../services/history.service.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try { res.json(await listHistory()); } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const { city_name, country, temperature, weather_condition, humidity } = req.body;
  if (!city_name || typeof city_name !== 'string') return res.status(400).json({ error: 'City is required.' });
  try { res.status(201).json(await saveHistory({ city_name, country, temperature, weather_condition, humidity })); } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try { await deleteHistory(Number(req.params.id)); res.status(204).end(); } catch (error) { next(error); }
});

export default router;
