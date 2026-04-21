# PRD — Calendar by unabase (v1)

> Resumen del Product Requirements Document v1. Fuente de verdad del producto.

---

## 1. Resumen del Producto

**Calendar by unabase** es una aplicación para crear y gestionar calendarios de producción audiovisual y creativa.

El producto busca replicar la familiaridad operativa de herramientas que la industria ya usa, especialmente **Apple Calendar** y **Google Sheets con vista mensual**, pero adaptadas a la lógica real de producción. La propuesta no es introducir una herramienta completamente nueva, sino una evolución natural del flujo actual de trabajo.

---

## 2. Problema que Resuelve

Hoy muchos equipos de producción creativa construyen sus calendarios en herramientas genéricas que no fueron diseñadas específicamente para producción. Eso genera:

- Falta de estructura para eventos de producción
- Dificultad para manejar dependencias reales
- Falta de lógica de versionado formal
- Poca integración de feriados y weather
- Repetición de procesos cada vez que se comienza un calendario nuevo
- Poca consistencia en el lenguaje o nombres de los eventos
- Poca flexibilidad idiomática
- Necesidad de rehacer calendarios en más de un idioma
- Poca colaboración entre equipos
- Uso de herramientas conocidas, pero poco especializadas

**Valor que entrega Calendar by unabase:** Una herramienta familiar, rápida de aprender, específica para producción, flexible, visualmente clara, colaborativa y mucho más rápida para construir calendarios consistentes.

---

## 3. Objetivo del Producto

Permitir que usuarios de producción creen, editen, organicen y exporten calendarios de producción de manera **rápida, intuitiva, consistente y profesional**.

**Objetivos específicos:**
- Reducir la curva de aprendizaje
- Mantener una experiencia familiar
- Ordenar la planificación mensual de una producción
- Permitir versionado formal del calendario
- Soportar lógica operativa real: etapas, feriados, dependencias, weather y templates
- Permitir construir calendarios de forma muy rápida y consistente
- Permitir que los calendarios reflejen el branding de la organización
- Facilitar el trabajo compartido entre equipos

---

## 4. Usuarios Objetivo

**Usuario principal:** Profesionales de producción audiovisual y creativa:
- Productores y productores ejecutivos
- Coordinadores de producción y postproducción
- Asistentes de producción
- Equipos de agencias (publicidad, diseño)
- Equipos de productoras audiovisuales y de publicidad
- Estudios de diseño y fotográficos
- Casas y equipos de postproducción

**Contexto de uso:** Usuarios acostumbrados a Apple Calendar, hojas de cálculo, calendarios mensuales hechos manualmente y cronogramas compartidos dentro de equipos.

---

## 5. Principios del Producto

1. Familiaridad visual inmediata
2. Curva de aprendizaje baja
3. Edición rápida
4. Terminología de industria
5. Estructura clara para producción real
6. Flexibilidad sin perder simplicidad
7. Versionado formal cuando el calendario se convierte en documento compartible
8. Consistencia entre calendarios
9. Rapidez de ejecución
10. Capacidad de colaboración
11. Posibilidad de aplicar branding de organización

---

## 6. Alcance de esta Versión (v1)

Esta versión incluye:

- Estructura de organización, proyecto y calendario
- Vista mensual principal (1 o 2 meses)
- Gestión de calendarios (activos y archivados)
- Creación y edición de eventos
- Stages / etapas
- Key dates / fechas clave
- Business days / días hábiles
- Calendar days / días corridos
- Orden manual de eventos dentro de un stage
- Templates
- Feriados
- Weather por ciudades/locaciones
- Versionado y PDFs (Draft y Official Version)
- Bilingüe inglés / español
- Parámetros globales definidos por organización
- Base para branding organizacional en salida visual y PDF

---

## 7. Modelo Conceptual

### Organización
Entidad principal del sistema. Define: defaults globales, templates compartidos, feriados por defecto, idioma, formato de fecha, temperatura, inicio de semana, zona horaria por defecto y branding organizacional.

### Proyecto
Entidad con la información general de producción: cliente, agencia, nombre del proyecto, director y/o fotógrafo, productor ejecutivo, ciudad principal de producción y estado.

### Calendario
Representación operativa y versionable del proyecto: eventos, feriados asociados, weather asociado, versión, PDF exportable, configuración específica y template de origen.

---

## 8. Requerimientos Funcionales

### 8.1 Idioma y Localización

**Objetivo:** Asegurar que la aplicación funcione completamente en inglés y español, respetando el lenguaje de la industria.

**Terminología base:**
- Stages / Etapas
- Key Dates / Fechas clave
- Business Days / Días hábiles
- Calendar Days / Días corridos
- Draft
- Official Version
- Template
- Holiday Calendars / Calendarios de feriados

**Regla de traducción de nombres de eventos:**
- Cuando un evento se crea en un idioma, su nombre inicial se replica igual en el otro idioma.
- Mientras el nombre del idioma contrario no haya sido editado, ambos idiomas comparten el mismo valor inicial.
- En el momento en que el nombre se edita en el otro idioma, ambos nombres pasan a ser independientes.
- Ejemplo: se crea "Reunión" en español → en inglés aparece "Reunión". Si en inglés se cambia a "Meeting", desde ese momento español = "Reunión" e inglés = "Meeting". Editar uno no modifica el otro.

**Criterios de aceptación:**
- El sistema puede mostrarse completamente en ambos idiomas.
- Los conceptos centrales no cambian de significado entre idiomas.
- Los textos principales usan lenguaje propio del rubro.
- Un evento nuevo replica su nombre inicial en ambos idiomas.
- Al editar el nombre en el idioma contrario, ambos nombres quedan desacoplados.
- Luego de desacoplarse, editar un idioma no modifica el otro.

---

### 8.2 Configuración Global y Herencia

**Objetivo:** Definir desde dónde nacen los parámetros del sistema y cómo se heredan.

La organización debe poder definir: idioma por defecto, Celsius o Fahrenheit, inicio de semana (domingo o lunes), zona horaria por defecto, formato de fecha, feriados por defecto, templates disponibles y branding organizacional.

Cada calendario/proyecto hereda esos valores al crearse y puede sobrescribirlos después. No habrá persistencia propia a nivel usuario en esta etapa.

**Criterios de aceptación:**
- Al crear un calendario nuevo, se cargan los defaults de la organización.
- Si el calendario cambia un valor heredado, ese valor del calendario prevalece.
- El sistema no guarda preferencias persistentes por usuario.

---

### 8.3 Formato de Fecha

**Objetivo:** Permitir que la organización defina el formato estándar de fechas.

Opciones: DD/MM/AA o MM/DD/AA. Configurado a nivel organización; el calendario lo usa por defecto.

**Criterios de aceptación:**
- La organización puede seleccionar uno de los dos formatos.
- El calendario usa ese formato por defecto.
- Las fechas visibles en el sistema respetan ese formato.

---

### 8.4 Gestión de Calendarios

**Objetivo:** Permitir administrar todos los calendarios creados dentro del sistema.

**Estados:** Activos y Archivados.

**Comportamiento esperado:**
- La vista abre por defecto en Activos.
- Se destaca o abre el último calendario visto o editado.
- La búsqueda funciona solo dentro del estado actual.
- El orden del listado es último editado arriba.

**Cada calendario debe permitir:** ver/esconder, editar información, copiar, archivar/activar, eliminar.

**Criterios de aceptación:**
- El usuario puede cambiar entre Activos y Archivados.
- La búsqueda en Activos no muestra Archivados.
- El listado se ordena por último editado.
- Cada calendario tiene disponibles sus acciones correspondientes.

---

### 8.5 Creación de Proyecto y Calendario

**Objetivo:** Permitir crear un nuevo proyecto con su calendario asociado.

**Campos requeridos:** Cliente, Agencia, Proyecto, Director, Fotógrafo, Productor ejecutivo, Ciudad principal de producción, Status, Color del calendario, Template activo de origen.

**Estados soportados:** Compitiendo, Ganado, Draft.

**Regla de color:** El gris queda reservado para feriados. Ningún calendario/proyecto puede usar gris.

**Información visible en el calendario:** Nombre del proyecto, Cliente y agencia, Director y/o fotógrafo, Productor ejecutivo, Ciudad principal de producción, Estado, Versión.

**Branding organizacional:** El calendario y sus salidas exportables deben poder reflejar branding de la organización. Esto debe contemplarse como base funcional del producto, aunque su profundidad visual pueda crecer en versiones posteriores.

**Criterios de aceptación:**
- El usuario puede crear un proyecto con todos los campos definidos.
- El color gris no aparece como opción para proyectos.
- Al abrir el calendario, se muestra la metadata principal del proyecto.
- El sistema contempla branding de organización como parte del calendario y/o PDF.

---

### 8.6 Vista Principal del Calendario

**Objetivo:** Entregar la superficie principal de trabajo del producto.

La vista principal debe ser mensual y visualmente cercana a Apple Calendar. Debe permitir ver 1 mes o 2 meses en pantalla (uno arriba y uno abajo). No se trabajará con horarios por ahora. Sí debe existir referencia de zona horaria del calendario.

Desde el menú del calendario se debe poder ajustar: Celsius/Fahrenheit, zona horaria, inicio de semana, formato de fecha.

**Criterios de aceptación:**
- El calendario abre en vista mensual.
- El usuario puede alternar entre 1 y 2 meses.
- La visualización responde al inicio de semana configurado.
- La zona horaria visible corresponde a la del calendario.

---

### 8.7 Eventos

**Objetivo:** Permitir crear, editar, ordenar y visualizar eventos dentro del calendario.

**Creación:** doble click en un día vacío crea un evento.
**Edición:** doble click en un evento existente abre edición.

**Campos del evento:**
- Stage / Etapa
- Nombre del evento
- Key Date / Fecha clave
- Tipo de duración (Business Days o Calendar Days)
- Cantidad de días
- Fecha de inicio
- Fecha de término

**Reglas:**
- La fecha de inicio se propone automáticamente según el día clickeado.
- La fecha de término se calcula automáticamente.
- Si un evento es Key Date, debe mostrarse con una estrellita.

**Orden manual en listado de eventos:** Los eventos pueden arrastrarse hacia arriba o hacia abajo dentro del mismo stage. El reordenamiento es solo de lista — no cambia el stage ni la fecha del evento.

**Criterios de aceptación:**
- Al hacer doble click en un día, se abre el modal de evento.
- La fecha de inicio se llena automáticamente.
- Cambiar cantidad de días o tipo de duración recalcula la fecha final.
- Un evento marcado como Key Date se ve con su indicador visual.
- En el listado de eventos, el usuario puede arrastrar eventos hacia arriba o abajo.
- El reordenamiento solo se permite dentro del mismo stage.

---

### 8.8 Lógica Avanzada de Eventos

**Objetivo:** Soportar planificación de producción más real y estructurada.

#### A. Stages / Etapas
Los eventos pueden pertenecer a una etapa. La etapa queda visible o asociada al evento.

#### B. Dependencias entre Eventos
Un evento puede comenzar X días antes o X días después de otro evento. La dependencia debe impactar las fechas automáticamente.

**Criterios de aceptación:**
- El usuario puede definir un evento base.
- El usuario puede definir desfase positivo o negativo.
- Si el evento base cambia, el dependiente se recalcula.

#### C. Grupos de Eventos
Los eventos se pueden agrupar.

**Acciones:** crear grupo, eliminar grupo, apagar grupo, prender grupo.

**Reglas:**
- Eliminar grupo no elimina eventos.
- Apagar grupo apaga sus eventos.
- Pueden prenderse eventos individualmente aunque el grupo esté apagado.
- Al prender nuevamente el grupo, los eventos apagados se prenden y los ya prendidos siguen prendidos.

**Criterios de aceptación:**
- Los grupos pueden crearse y eliminarse sin borrar eventos.
- Los grupos pueden activarse y desactivarse.
- La lógica de encendido individual se mantiene al reactivar el grupo.

---

### 8.9 Templates

**Objetivo:** Permitir reutilizar estructuras base de calendarios.

Debe existir un template base de sistema: **Integrated Production Schedule**.

Los templates pertenecen a la organización. Tipos: templates de unabase y templates creados por usuarios de la organización.

**Reglas:**
- Los templates de unabase no se eliminan (solo se pueden desactivar).
- Los templates creados por usuarios se pueden usar, copiar y eliminar.

**Todos los templates deben permitir:** crear proyecto desde template, copiar template.

**Información visible por template:** cantidad de eventos, cantidad de stages, cantidad de grupos, cantidad de veces usado.

**Orden:** más usado arriba, menos usado abajo.

**Criterios de aceptación:**
- El sistema incluye el template base.
- Los templates aparecen a nivel organización.
- Los templates muestran sus métricas básicas.
- Los templates user-made se pueden eliminar.
- Los templates de unabase se pueden desactivar, pero no eliminar.

---

### 8.10 Feriados

**Objetivo:** Integrar calendarios de feriados en la lógica del calendario.

Cada calendario puede tener 0, 1, 2 o más calendarios de feriados asociados. La organización puede definir feriados por defecto, que se cargan automáticamente al crear un nuevo calendario. Luego el usuario puede agregar, quitar o dejar el calendario sin feriados.

**Reglas:**
- Los feriados por defecto pertenecen a la organización.
- El color de feriados es siempre gris.
- El gris no puede usarse en calendarios/proyectos.
- Los feriados afectan el cálculo cuando el evento usa días hábiles.
- Los feriados pueden prenderse o apagarse a nivel visual en la vista calendario.
- Los feriados pueden prenderse o apagarse a nivel visual en los PDFs.

**Aclaración funcional importante:** Prender o apagar feriados a nivel visual afecta solo su visibilidad, no necesariamente su existencia lógica en el calendario. Su impacto sobre cálculos de Business Days debe definirse por su asociación activa al calendario, no solo por si están visibles o no.

**Criterios de aceptación:**
- Un calendario nuevo hereda los feriados por defecto.
- El usuario puede modificar esa selección después.
- Los feriados impactan el cálculo de Business Days.
- Los feriados se visualizan en gris cuando están visibles.
- El usuario puede mostrar u ocultar feriados en vista calendario.
- El usuario puede mostrar u ocultar feriados en PDF.

---

### 8.11 Weather

**Objetivo:** Incorporar información climática útil para producción.

Cada calendario puede tener 0, 1, 2 o más ciudades/locaciones asociadas. La ciudad principal del proyecto debe sugerir el primer weather. Luego el usuario puede agregar o quitar ciudades.

**Comportamiento al posicionarse sobre un día:**
- Mostrar pronóstico del día si existe.
- Si no existe, mostrar estadística histórica.
- Si no hay datos, mostrar "sin información".

**Criterios de aceptación:**
- El sistema puede operar sin weather.
- El sistema puede operar con múltiples ciudades.
- El usuario ve pronóstico o histórico según disponibilidad.
- Si no hay datos, se informa claramente.

---

### 8.12 Versionado y PDF

**Objetivo:** Permitir distinguir entre estado de trabajo, draft y versión oficial.

Todo calendario comienza en Versión 0.

**Estado en edición:** Si cambian datos del proyecto o eventos, la versión lleva asterisco (ejemplo: Versión 1*). Los cambios de visualización no activan asterisco.

**Modos de PDF:**
- **Descargar Draft:** genera PDF con marca DRAFT, no cambia la versión oficial.
- **Crear nueva versión oficial:** incrementa la versión del calendario.

**Reglas:**
- Draft genera PDF con marca DRAFT.
- Draft no cambia la versión oficial.
- Crear nueva versión oficial incrementa la versión.
- Si no hubo cambios desde la última versión oficial, no debe mostrarse la opción Draft.
- Una versión oficial puede descargarse múltiples veces mientras no cambien datos ni eventos.

**Criterios de aceptación:**
- Un calendario nuevo parte en versión 0.
- Cambiar un evento activa el asterisco.
- Cambiar visualización no activa el asterisco.
- El usuario puede descargar Draft solo si hubo cambios.
- El usuario puede crear una nueva versión oficial desde el PDF.

---

### 8.13 Patrones de Interacción

**Objetivo:** Mantener consistencia en la interacción de toda la aplicación.

En modales: Enter confirma la acción principal, Esc cancela o cierra sin guardar, puede existir botón OK / Guardar.

Esto aplica a: creación de eventos, edición de eventos, edición de proyecto/calendario, selección de templates, configuraciones y otras acciones modales.

**Criterios de aceptación:**
- Enter ejecuta la acción primaria del modal.
- Esc cierra o cancela sin guardar.
- El patrón es consistente entre pantallas.

---

## 9. Reglas de Negocio Principales

1. La organización define los defaults.
2. El calendario puede sobrescribir lo heredado.
3. No hay persistencia propia de usuario por ahora.
4. El gris está reservado para feriados.
5. La búsqueda funciona solo dentro del estado actual.
6. Cambios de contenido formal activan asterisco.
7. Cambios de visualización no activan asterisco.
8. El calendario opera bajo su propia zona horaria.
9. Weather múltiple significa múltiples ciudades/locaciones.
10. Dependencias entre eventos sí afectan fechas.
11. Los nombres de eventos nacen replicados entre idiomas y se independizan cuando se edita el idioma contrario.
12. El reordenamiento manual de eventos se permite solo dentro del mismo stage.
13. La visibilidad de feriados y su impacto de cálculo no deben confundirse como la misma cosa.
14. El calendario y sus salidas deben poder reflejar branding de la organización.

---

## 10. Fuera de Alcance por Ahora

- Manejo de horarios detallados
- Vistas horarias o semanales complejas
- Persistencia personalizada por usuario
- Múltiples proveedores de weather
- Lógica avanzada multi-zona entre calendarios
- Automatizaciones complejas más allá de dependencias base
- Traducción automática inteligente de nombres de eventos

---

## 11. Riesgos del Producto

- Mezclar Proyecto y Calendario en desarrollo o UX
- Complejizar demasiado la interfaz y romper la familiaridad
- Implementar dependencias sin reglas claras de recálculo
- Generar conflictos de herencia entre organización y calendario
- Tratar weather o feriados como extras cuando en realidad son parte operativa del sistema
- Confundir "visibilidad" de feriados con "aplicación lógica" de feriados
- No definir bien el desacople de nombres bilingües en eventos
- No dejar claro que el orden manual dentro del stage es un orden de lista y no necesariamente un cambio de fecha

---

## 12. Métricas de Éxito Sugeridas

- Tiempo para crear un nuevo calendario
- Tiempo para crear el primer evento
- Cantidad de calendarios creados por organización
- Uso de templates
- Cantidad de exports PDF
- Frecuencia de uso de Draft vs Official Version
- Tasa de adopción sin capacitación
- Tasa de edición de eventos por doble click
- Tasa de uso de duplicación y reutilización de estructura
- Cantidad de calendarios generados con branding organizacional
- Porcentaje de eventos renombrados en segundo idioma

---

## 13. MVP Final Definido

El MVP de Calendar by unabase incluye: bilingüe inglés/español, defaults definidos por organización, formato de fecha, vista mensual principal (1 o 2 meses), gestión de calendarios activos y archivados, creación de proyecto/calendario, metadata de proyecto, eventos, naming bilingüe base con independencia por idioma al editar, key dates, stages, orden manual de eventos dentro del mismo stage, business days y calendar days, templates, feriados, weather por ciudades, versionado, PDF Draft, PDF Official Version, modales consistentes y base para branding de organización.

---

## 14. Puntos Pendientes para Próxima Iteración

1. **Branding organizacional:** Definir exactamente qué incluye (logo, colores, nombre visible, pie o encabezado en PDF, branding dentro de la vista calendario o solo exportaciones).
2. **Listado de eventos:** Definir si ese listado vive en panel lateral, en vista secundaria, en editor/modal o en una pestaña específica.
3. **Feriados visibles vs feriados activos:** Definir formalmente si un feriado oculto sigue afectando cálculo o si existe además una acción distinta para desactivar su impacto lógico. Lo más ordenado sería separar visible/oculto de activo/inactivo para cálculo.
4. **Naming bilingüe en otros campos:** Ya quedó claro para el nombre del evento, pero conviene definir si esto también aplicará a nombres de stages, nombres de grupos, templates personalizados y notas o descripciones futuras.
