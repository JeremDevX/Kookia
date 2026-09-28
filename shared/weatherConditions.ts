export type WeatherConditionKind = "clear" | "partlyCloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm" | "unknown";
interface WeatherCondition { label: string; kind: WeatherConditionKind; }

// Open-Meteo WMO codes. A daily code describes the most severe forecast episode,
// not necessarily the weather throughout the day. https://open-meteo.com/en/docs
const conditions: Record<number, WeatherCondition> = {
  0: { label: "Ciel dégagé", kind: "clear" },
  1: { label: "Peu nuageux", kind: "partlyCloudy" },
  2: { label: "Éclaircies", kind: "partlyCloudy" },
  3: { label: "Couvert", kind: "cloudy" },
  45: { label: "Brouillard", kind: "fog" },
  48: { label: "Brouillard givrant", kind: "fog" },
  51: { label: "Bruine légère", kind: "drizzle" },
  53: { label: "Bruine", kind: "drizzle" },
  55: { label: "Bruine dense", kind: "drizzle" },
  56: { label: "Bruine verglaçante", kind: "drizzle" },
  57: { label: "Bruine verglaçante", kind: "drizzle" },
  61: { label: "Pluie légère", kind: "rain" },
  63: { label: "Pluie", kind: "rain" },
  65: { label: "Forte pluie", kind: "rain" },
  66: { label: "Pluie verglaçante", kind: "rain" },
  67: { label: "Pluie verglaçante", kind: "rain" },
  71: { label: "Neige légère", kind: "snow" },
  73: { label: "Neige", kind: "snow" },
  75: { label: "Forte neige", kind: "snow" },
  77: { label: "Neige en grains", kind: "snow" },
  80: { label: "Averses légères", kind: "rain" },
  81: { label: "Averses", kind: "rain" },
  82: { label: "Fortes averses", kind: "rain" },
  85: { label: "Averses de neige", kind: "snow" },
  86: { label: "Fortes averses de neige", kind: "snow" },
  95: { label: "Orage", kind: "storm" },
  96: { label: "Orage et grêle", kind: "storm" },
  97: { label: "Fort orage", kind: "storm" },
  99: { label: "Orage et forte grêle", kind: "storm" },
};
export function weatherCondition(code: number | null | undefined): WeatherCondition {
  return (code == null ? undefined : conditions[code]) ?? { label: "Ciel inconnu", kind: "unknown" };
}
