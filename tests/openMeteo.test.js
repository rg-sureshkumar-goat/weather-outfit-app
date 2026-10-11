// R1: the forecast request and reading the response.

import { describe, expect, it } from 'vitest';
import { forecastUrl, parseForecast, fetchForecast, ForecastError } from '../src/weather/openMeteo.js';
import { FIXTURES, loadFixture } from './helpers.js';

describe('forecast request (R1)', () => {
  const url = new URL(forecastUrl({ latitude: 30.26715, longitude: -97.74306 }));

  it('goes only to Open-Meteo, with coordinates rounded to 2 decimals', () => {
    expect(url.origin).toBe('https://api.open-meteo.com');
    expect(url.searchParams.get('latitude')).toBe('30.27');
    expect(url.searchParams.get('longitude')).toBe('-97.74');
  });

  it('asks for every field the rules need, in °F, mph and inches, for 7 days', () => {
    expect(url.searchParams.get('hourly').split(',')).toEqual([
      'temperature_2m', 'apparent_temperature', 'precipitation_probability',
      'uv_index', 'wind_gusts_10m', 'snowfall', 'weather_code',
    ]);
    expect(url.searchParams.get('daily')).toBe('temperature_2m_max,temperature_2m_min');
    expect(url.searchParams.get('current')).toBe('temperature_2m,apparent_temperature,weather_code');
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit');
    expect(url.searchParams.get('wind_speed_unit')).toBe('mph');
    expect(url.searchParams.get('precipitation_unit')).toBe('inch');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('7');
  });
});

describe('reading the response (R1)', () => {
  it.each(FIXTURES)('%s: 7 days of 24 local hours, and today is the location\'s date', (name) => {
    const f = loadFixture(name);
    expect(f.days).toHaveLength(7);
    f.days.forEach((d) => expect(d.hours).toHaveLength(24));
    expect(f.today).toBe(f.days[0].date);
    expect(f.now.startsWith(f.today)).toBe(true);
    expect(typeof f.current.temp).toBe('number');
  });

  it('keeps missing values as null so rules can skip them (R29)', () => {
    const f = parseForecast({
      current: { time: '2026-10-12T08:00' },
      daily: { time: ['2026-10-12'], temperature_2m_max: [80], temperature_2m_min: [60] },
      hourly: { time: ['2026-10-12T09:00'], apparent_temperature: [70], uv_index: [null] },
    });
    const hour = f.days[0].hours[0];
    expect(hour.feels).toBe(70);
    expect(hour.uv).toBeNull();
    expect(hour.rain).toBeNull();
  });
});

describe('fetching (R30 groundwork)', () => {
  const okJson = { current: { time: '2026-10-12T08:00' }, daily: { time: [] }, hourly: { time: [] } };

  it('returns the parsed forecast', async () => {
    const fake = async () => ({ ok: true, json: async () => okJson });
    await expect(fetchForecast({ latitude: 30, longitude: -97 }, fake)).resolves.toMatchObject({ today: '2026-10-12' });
  });

  it('reports a network failure as offline', async () => {
    const fake = async () => { throw new TypeError('Failed to fetch'); };
    const error = await fetchForecast({ latitude: 30, longitude: -97 }, fake).catch((e) => e);
    expect(error).toBeInstanceOf(ForecastError);
    expect(error.offline).toBe(true);
  });

  it('reports a service error with its status', async () => {
    const fake = async () => ({ ok: false, status: 503 });
    await expect(fetchForecast({ latitude: 30, longitude: -97 }, fake)).rejects.toThrow('503');
  });
});
