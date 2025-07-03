import { tool } from 'ai';
import { z } from 'zod';

export const getWeather = tool({
  description: 'Get the current weather at a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async (input) => {
    // Mock weather data for testing
    const weatherData = {
      location: input.location,
      temperature: 72,
      conditions: 'Partly cloudy',
      humidity: 65,
      windSpeed: 10,
    };

    return weatherData;
  },
});
