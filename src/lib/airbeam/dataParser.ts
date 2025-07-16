import { AirBeamData } from './types';

export function parseAirBeamMessage(message: string): Partial<AirBeamData> {
  const parts = message.trim().split(';');
  if (parts.length < 5) {
    return {};
  }

  const value = parseFloat(parts[0]);
  const shortType = parts[4].toLowerCase();
  const data: Partial<AirBeamData> = {
    timestamp: new Date(),
  } as Partial<AirBeamData>;

  switch (shortType) {
    case 'pm1':
    case 'pm01':
      data.pm1 = value;
      break;
    case 'pm25':
    case 'pm2.5':
      data.pm25 = value;
      break;
    case 'pm10':
      data.pm10 = value;
      break;
    case 'temp':
    case 'temperature':
    case 'tmp':
      data.temp = value;
      break;
    case 'humidity':
    case 'hum':
    case 'rh':
      data.humidity = value;
      break;
    default:
      break;
  }

  return data;
}
