// Explicit scenario hypotheses shared with the offline document workshop.
// Callers enforce their own provenance, completeness and freshness requirements.
export interface WeatherScenarioConditions {
  weatherCode: number;
  temperatureMax: number;
  maxWindSpeed: number;
}
export function weatherScenarioEffect(hasTerrace: boolean, conditions: WeatherScenarioConditions) {
  const { weatherCode: code, temperatureMax, maxWindSpeed: wind } = conditions;
  let percent = 0, reason = "Pas d’ajustement retenu pour ces conditions.";
  const choose = (withoutTerrace: number, withTerrace: number) => hasTerrace ? withTerrace : withoutTerrace;
  if ([95, 96, 97, 99].includes(code) || wind >= 40) {
    percent = choose(-10, -30); reason = wind >= 40 ? "Vent maximal prévu d’au moins 40 km/h." : "Orage prévu.";
  } else if ([48, 56, 57, 65, 66, 67, 71, 73, 75, 77, 82, 85, 86].includes(code)) {
    percent = choose(-8, -25); reason = "Fortes précipitations, neige ou conditions givrantes prévues.";
  } else if ([61, 63, 80, 81].includes(code)) {
    percent = choose(-5, -15); reason = "Pluie ou averses prévues.";
  } else if ([45, 51, 53, 55].includes(code)) {
    percent = choose(-3, -10); reason = "Brouillard ou bruine prévus.";
  } else if ([0, 1, 2].includes(code) && temperatureMax >= 15 && temperatureMax <= 28 && wind < 25) {
    percent = choose(3, 10); reason = "Ciel dégagé ou éclaircies, maximum de 15 à 28 °C et vent inférieur à 25 km/h.";
  }
  return { percent, reason };
}
