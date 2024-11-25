// index.js
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

// Helsjekkendpoint
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

// weatherService.js
export class WeatherService {
    constructor() {
        this.baseUrl = 'https://api.met.no/weatherapi/locationforecast/2.0';
        this.locations = {
            'Stavanger': { lat: 58.9700, lon: 5.7331 },
            'Oslo': { lat: 59.9139, lon: 10.7522 },
            'Bergen': { lat: 60.3913, lon: 5.3221 }
        };
    }

    async getWeather({ location = 'Stavanger', unit = 'C', details = true }) {
        try {
            const coords = this.locations[location];
            if (!coords) {
                throw new Error(`Ukjent lokasjon: ${location}`);
            }

            const url = `${this.baseUrl}/compact?lat=${coords.lat}&lon=${coords.lon}`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': process.env.USER_AGENT || 'WeatherApp/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.formatWeatherData(data, location, unit, details);

        } catch (error) {
            console.error('Feil ved henting av værdata:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    formatWeatherData(data, location, unit, details) {
        const current = data.properties.timeseries[0];
        const nextHour = current.data.next_1_hours || {};
        const instant = current.data.instant.details;

        const tempC = instant.air_temperature;
        const temperature = unit === 'F' ? (tempC * 9/5) + 32 : tempC;

        const weatherData = {
            success: true,
            location: location,
            temperature: Math.round(temperature * 10) / 10,
            unit: unit,
            condition: nextHour.summary?.symbol_code || 'unknown',
            updated: current.time
        };

        if (details) {
            weatherData.details = {
                wind_speed: instant.wind_speed,
                wind_direction: this.formatWindDirection(instant.wind_from_direction),
                humidity: instant.relative_humidity,
                pressure: instant.air_pressure_at_sea_level,
                cloudiness: instant.cloud_area_fraction,
                precipitation: nextHour.details?.precipitation_amount || 0
            };
        }

        return weatherData;
    }

    formatWindDirection(degrees) {
        const directions = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }
}
