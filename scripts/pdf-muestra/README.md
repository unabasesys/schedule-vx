# Un PDF de muestra, sin navegador y sin cuenta

    npm run pdf:muestra

Escribe cuatro PDF en `scripts/pdf-muestra/salida/`, uno por cada camino del exportador:
calendario simple, multi-calendario, borrador (con la marca DRAFT) y en inglés.

## Para qué

La exportación a PDF es la única parte de Calendar que **no se puede verificar mirando la
pantalla**: hay que entrar con una sesión de verdad, abrir un calendario y bajar el
archivo. En la práctica eso significaba que no se verificaba, y es justo lo que el cliente
recibe y reenvía.

Esto corre el exportador REAL (`composables/usePdfExport.js`) contra un calendario de
prueba que ejercita los casos molestos: eventos de varios días, de días hábiles, fechas
clave, un día con más eventos de los que caben en la celda, eventos inactivos e internos
que NO deben salir, y un rango que cruza de mes.

## Cómo funciona sin Nuxt

`registrar.mjs` instala un resolvedor de módulos que:

- traduce los alias `~/` a rutas del repo — así el archivo bajo prueba queda intacto;
- sustituye **solo** `~/stores/settings`, que necesitaría Pinia, por un doble mínimo;
- envuelve `jspdf` para quedarse con el PDF en vez de descargarlo. `save` no vive en el
  prototipo —jsPDF se lo asigna a cada instancia en el constructor— así que hay que
  reemplazarlo después de `super()`.

`JSPDF=/ruta/a/otro/jspdf.es.min.js` permite generar con otra versión, que es como se
verificó la subida de jsPDF 2.5.1 → 4.2.1: los flujos de contenido salieron byte a byte
idénticos, y las 8 páginas renderizadas, idénticas píxel a píxel.

## Comparar dos versiones

    pdftoppm -r 100 -png antes.pdf a && pdftoppm -r 100 -png despues.pdf d
    # y comparar los sha256 de a-*.png con los de d-*.png
