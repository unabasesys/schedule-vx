# Flujo: Feriados y Clima

## Descripción

La app integra feriados nacionales de más de 50 países y datos climáticos por ciudad para enriquecer el calendario de producción y ayudar en la planificación. Ambos son parte operativa del sistema, no features opcionales.

---

## Feriados

### Fuente de datos
**API:** [Nager.Date](https://date.nager.at/) — pública, sin clave de API

### Reglas de Negocio

- El color de feriados es **siempre gris** — no puede usarse en proyectos/calendarios.
- Los feriados por defecto pertenecen a la organización (configurados en Settings → "Default Holidays").
- Al crear un nuevo calendario, se cargan automáticamente los países configurados como feriados por defecto de la organización.
- El usuario puede después agregar, quitar o dejar el calendario sin feriados.
- Cada calendario puede tener 0, 1, 2 o más calendarios de feriados asociados.
- El botón de Holidays en la barra de herramientas se muestra en verde/teal cuando el calendario tiene al menos un país cargado.

**Distinción crítica — Visibilidad vs. Impacto en Cálculo:**
- **Visibilidad:** los feriados pueden prenderse o apagarse visualmente en la vista calendario y en los PDFs. Esto solo afecta si se ven o no.
- **Impacto en cálculo:** los feriados afectan el cálculo de Business Days cuando están *activamente asociados* al calendario, independientemente de si están visibles o no.
- Estas dos dimensiones son independientes. Ocultar un feriado no significa desactivar su efecto en el cálculo de días hábiles.

> **Pendiente para próxima iteración:** Definir formalmente si un feriado oculto sigue afectando cálculo o si existe una acción distinta para desactivar su impacto lógico. Lo más ordenado sería separar: visible/oculto ← para visualización | activo/inactivo ← para cálculo.

### Flujo de Configuración

1. Usuario abre el **panel de Feriados** (botón en `CalendarView.vue`)
2. Se despliega `HolidaysPanel.vue` desde la derecha
3. Usuario busca su país (búsqueda por nombre o código ISO)
4. `holidaysStore.loadAllCountries()` → `GET /api/v3/AvailableCountries` (se cachea)
5. Usuario selecciona un país → se agrega a `proj.holidays[]`
6. `holidaysStore.fetchHolidaysForYear(code, year)` → `GET /api/v3/PublicHolidays/{year}/{code}`
7. Los feriados se muestran como **puntos de color gris** en el grid del calendario

### Caché
- Lista de países: en memoria (`holidaysStore.allCountries`)
- Feriados por país+año: en memoria (`holidaysStore.countryHolidays["CL_2025"]`)
- No se persiste en localStorage; se recarga en cada sesión si es necesario

### Visualización
- `CalendarMonth.vue` verifica cada celda de día con `holidaysStore.isHoliday(dateStr, codes, year)`
- Los días feriados muestran un punto gris y tooltip con el nombre del feriado
- El usuario puede mostrar u ocultar feriados en vista calendario
- El usuario puede mostrar u ocultar feriados en el PDF exportado

### Criterios de Aceptación
- Un calendario nuevo hereda los feriados por defecto de la organización.
- El usuario puede modificar esa selección después.
- Los feriados impactan el cálculo de Business Days.
- Los feriados se visualizan en gris cuando están visibles.
- El usuario puede mostrar u ocultar feriados en vista calendario.
- El usuario puede mostrar u ocultar feriados en PDF.

---

## Clima (Weather)

### Fuente de datos
**API:** [Open-Meteo](https://open-meteo.com/) — pública, sin clave de API

### Reglas de Negocio

- Cada calendario puede tener 0, 1, 2 o más ciudades/locaciones asociadas.
- La ciudad principal del proyecto sugiere automáticamente el primer weather al crear el calendario.
- El usuario puede agregar o quitar ciudades después.
- El sistema puede operar sin weather — no es obligatorio.

### Comportamiento al Posicionarse sobre un Día

| Situación | Lo que se muestra |
|-----------|------------------|
| Fecha futura con pronóstico disponible | Pronóstico del día |
| Fecha pasada o sin pronóstico | Estadística histórica |
| Sin datos disponibles | "Sin información" |

### Flujo de Configuración

1. El proyecto tiene `cities[]` — ciudades configuradas al crear o editar el proyecto
2. Ciudades por defecto disponibles: Santiago, NYC, LA, Miami, Bogotá, Buenos Aires, México, Madrid, Barcelona
3. Al abrir el calendario, `WeatherStrip.vue` solicita el clima para las ciudades del proyecto

### Flujo de Carga

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

### Datos Mostrados en `WeatherStrip.vue`
- Temperatura mínima y máxima del día actual
- Código de clima → emoji (via `weatherCodes.js`)
- Hora de salida y puesta del sol
- Previsión de hasta 15 días

### Unidades de Temperatura
- Toggle en `CalendarView.vue`: °C ↔ °F
- Configurado por organización (Celsius o Fahrenheit por defecto)
- Conversión via `helpers.toDisplayTemp(celsius, unit)` — los datos se almacenan siempre en Celsius
- **Cambiar la unidad de temperatura no activa el asterisco de versión** (es un cambio de visualización, no de contenido).

### Criterios de Aceptación
- El sistema puede operar sin weather.
- El sistema puede operar con múltiples ciudades.
- El usuario ve pronóstico o histórico según disponibilidad.
- Si no hay datos, se informa claramente.

---

## Archivos Involucrados

### Feriados
| Archivo | Rol |
|---------|-----|
| `components/holidays/HolidaysPanel.vue` | UI del panel de feriados |
| `stores/holidays.js` | Estado, caché y llamadas a API |
| `stores/settings.js` → `orgDefaultHolidays` | Feriados por defecto de la organización (persiste como `ub_org_default_holidays`) |
| `components/settings/SettingsModal.vue` | UI para configurar países por defecto de la organización |
| `components/schedule/CalendarMonth.vue` | Visualización en el grid |

### Clima
| Archivo | Rol |
|---------|-----|
| `components/weather/WeatherStrip.vue` | UI de la franja de clima |
| `stores/weather.js` | Estado, caché y llamadas a API |
| `utils/weatherCodes.js` | Mapa de código WMO → emoji |
| `utils/helpers.js` → `toDisplayTemp()`, `tempSymbol()` | Conversión de temperatura |
| `utils/constants.js` → `DEFAULT_CITIES` | Ciudades preconfiguradas |
