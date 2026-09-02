// Envuelve jspdf para quedarse con el PDF en vez de descargarlo.
//
// `save` NO vive en el prototipo: jsPDF se lo asigna a CADA instancia en el constructor,
// así que parchear el prototipo no hace nada y una subclase queda tapada por la propiedad
// propia. Hay que reemplazarla después de `super()`. Eso es todo lo que hace esto: el
// exportador que se prueba no cambia una línea.
import fs from "node:fs";
import * as real from "#jspdf-real";

const Base = real.jsPDF || real.default?.jsPDF || real.default;

export class jsPDF extends Base {
  constructor(...args) {
    super(...args);
    this.save = (nombre) => {
      globalThis.__PDF__ = { nombre, bytes: Buffer.from(this.output("arraybuffer")) };
      if (process.env.PDF_SALIDA) fs.writeFileSync(process.env.PDF_SALIDA, globalThis.__PDF__.bytes);
      return this;
    };
  }
}

export default jsPDF;
