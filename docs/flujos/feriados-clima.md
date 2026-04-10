# Flujo: Feriados y Clima

## Descripción

La app integra feriados nacionales de más de 50 países y datos climáticos por ciudad para enriquecer el calendario de producción y ayudar en la planificación.

---

## Feriados

### Fuente de datos
**API:** [Nager.Date](https://date.nager.at/) — pública, sin clave de API

### Flujo de configuración

1. Usuario abre el **panel de Feriados** (botón en `CalendarView.vue`)
2. Se despliega `HolidaysPanel.vue` desde la derecha
3. Usuario busca su país (búsqueda por nombre o código ISO)
4. `holidaysStore.loadAllCountries()` → `GET /api/v3/AvailableCountries` (se cachea)
5. Usuario selecciona un país → se agrega a `proj.holidays[]`
6. `holidaysStore.fetchHolidaysForYear(code, year)` → `GET /api/v3/PublicHolidays/{year}/{code}`
7. Los feriados se muestran como **puntos de color** en el grid del calendario

### Caché
- Lista de países: en memoria (`holidaysStore.allCountries`)
- Feriados por país+año: en memoria (`holidaysStore.countryHolidays["CL_2025"]`)
- No se persiste en localStorage; se recarga en cada sesión si es necesario

### Visualización
- `CalendarMonth.vue` verifica cada celda de día con `holidaysStore.isHoliday(dateStr, codes, year)`
- Los días feriados muestran un punto y tooltip con el nombre del feriado

---

## Clima

### Fuente de datos
**API:** [Open-Meteo](https://open-meteo.com/) — pública, sin clave de API

### Flujo de configuración

1. El proyecto tiene `cities[]` — ciudades configuradas al crear o editar el proyecto
2. Ciudades por defecto disponibles: Santiago, NYC, LA, Miami, Bogotá, Buenos Aires, México, Madrid, Barcelona
3. Al abrir el calendario, `WeatherStrip.vue` solicita el clima para las ciudades del proyecto

### Flujo de carga

```
weatherStore.fetchWeather(proj, cityIdx, dateStr)
  ├── Construye key: "[projId]_[cityIdx]"
  ├── Si ya en caché → usa el dato existente
  └── GET https://api.open-meteo.com/v1/forecast
        params:
          latitude, longitude  (de proj.cities[cityIdx])
          daily: weather_code, temperature_2m_max, temperature_2m_min,
                 sunrise, sunset
          hourly: temperature_2m
          forecast_days: 15
          timezone: auto
```

### Datos mostrados en `WeatherStrip.vue`
- Temperatura mínima y máxima del día actual
- Código de clima → emoji (via `weatherCodes.js`)
- Hora de salida y puesta del sol
- Previsión de hasta 15 días

### Unidades de temperatura
- Toggle en `CalendarView.vue`: °C ↔ °F
- Conversión via `helpers.toDisplayTemp(celsius, unit)` — nunca se almacenan en Fahrenheit

---

## Archivos involucrados

### Feriados
| Archivo | Rol |
|---------|-----|
| `components/holidays/HolidaysPanel.vue` | UI del panel de feriados |
| `stores/holidays.js` | Estado, caché y llamadas a API |
| `components/schedule/CalendarMonth.vue` | Visualización en el grid |

### Clima
| Archivo | Rol |
|---------|-----|
| `components/weather/WeatherStrip.vue` | UI de la franja de clima |
| `stores/weather.js` | Estado, caché y llamadas a API |
| `utils/weatherCodes.js` | Mapa de código WMO → emoji |
| `utils/helpers.js` → `toDisplayTemp()`, `tempSymbol()` | Conversión de temperatura |
| `utils/constants.js` → `DEFAULT_CITIES` | Ciudades preconfiguradas |
