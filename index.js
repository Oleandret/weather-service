import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WeatherService } from './weatherService.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const weatherService = new WeatherService();

// Helsesjekk endpoint
app.get('/', (req, res) => {
    res.json({ status: 'Weather Service is running' });
});

// Værdata endpoint
app.get('/api/weather', async (req, res) => {
    try {
        const { location = 'Stavanger', unit = 'C', details = true } = req.query;
        const weather = await weatherService.getWeather({ location, unit, details: details === 'true' });
        res.json(weather);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server kjører på port ${port}`);
});
