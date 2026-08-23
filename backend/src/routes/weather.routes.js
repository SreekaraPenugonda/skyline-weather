import { Router } from 'express';
import { getAirQuality, getForecast, getWeatherByCity, getWeatherByCoordinates } from '../services/weather.service.js';

const router = Router();

router.get('/coordinates/current', async (req, res, next) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return res.status(400).json({ error: 'Valid coordinates are required.' });
  try { res.json(await getWeatherByCoordinates(latitude, longitude)); } catch (error) { next(error); }
});

router.get('/forecast/:city', async (req, res, next) => {
  try { res.json(await getForecast(req.params.city.trim())); } catch (error) { if (error.response?.status === 404) return res.status(404).json({ error: 'We could not find that city.' }); next(error); }
});

router.get('/air-quality', async (req, res, next) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return res.status(400).json({ error: 'Valid coordinates are required.' });
  try { res.json(await getAirQuality(latitude, longitude)); } catch (error) { next(error); }
});

router.get('/:city', async (req, res, next) => {
  const city = req.params.city.trim();
  if (!city || city.length > 100) return res.status(400).json({ error: 'Please provide a valid city name.' });
  try {
    res.json(await getWeatherByCity(city));
  } catch (error) {
    if (error.response?.status === 404) return res.status(404).json({ error: 'We could not find that city.' });
    next(error);
  }
});

export default router;
