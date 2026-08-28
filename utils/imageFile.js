// Preparar una imagen del usuario para subirla dentro de un documento.
//
// Todas las imágenes de la app viajan en base64 DENTRO del documento de Mongo (fotos
// de contactos, logos de empresas, capturas en las sugerencias): no hay bucket ni
// servidor de archivos. Eso obliga a reducirlas ANTES de mandarlas — una captura de
// una pantalla Retina pesa 6 MB en PNG, y cuatro de esas no caben en un documento.
//
// Reducir es del navegador y no del servidor a propósito: lo que no se sube, no se
// espera. Con esto una captura queda en 200–400 KB y sube al instante.

// 1600 px de ancho es el punto donde una captura de pantalla se sigue leyendo (el
// texto de un formulario, un mensaje de error) y ya no pesa. Más grande no aporta:
// se ve en una tarjeta de 400 px y se abre a pantalla completa.
const MAX_SIDE = 1600
const QUALITY = 0.85

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024   // lo que se acepta ANTES de reducir

// Convierte un File de imagen en un dataURL liviano. Devuelve `{ dataUrl, name }`.
// Lanza si el archivo no es una imagen o si el navegador no la puede decodificar
// (un .png que en realidad es otra cosa, un HEIC en un navegador que no lo soporta).
export function shrinkImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      return reject(new Error('no-es-imagen'))
    }
    if (file.size > MAX_UPLOAD_BYTES) return reject(new Error('muy-pesada'))

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('no-se-pudo-leer'))
    reader.onload = (ev) => {
      const img = new Image()
      img.onerror = () => reject(new Error('no-se-pudo-leer'))
      img.onload = () => {
        let { width, height } = img
        const escala = Math.min(1, MAX_SIDE / Math.max(width, height))
        width  = Math.max(1, Math.round(width * escala))
        height = Math.max(1, Math.round(height * escala))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        // Fondo blanco: un PNG con transparencia pasado a JPEG deja el fondo NEGRO,
        // y una captura de pantalla con esquinas transparentes se vería sucia.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        try {
          resolve({ dataUrl: canvas.toDataURL('image/jpeg', QUALITY), name: file.name || '' })
        } catch {
          // Un canvas "contaminado" (imagen de otro origen) no se puede exportar.
          reject(new Error('no-se-pudo-leer'))
        }
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

// Peso aproximado de un dataURL, para mostrárselo a quien sube. base64 infla 4/3.
export const dataUrlBytes = (dataUrl = '') => Math.round((dataUrl.length - (dataUrl.indexOf(',') + 1)) * 0.75)

export const formatBytes = (n = 0) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

// Saca los archivos de imagen de un pegado o de un arrastre. El portapapeles trae
// la captura como un item de tipo `file` sin nombre; el arrastre la trae en `files`.
export function imagesFromTransfer(dt) {
  if (!dt) return []
  const items = Array.from(dt.items || [])
    .filter((i) => i.kind === 'file' && String(i.type || '').startsWith('image/'))
    .map((i) => i.getAsFile())
    .filter(Boolean)
  if (items.length) return items
  return Array.from(dt.files || []).filter((f) => String(f.type || '').startsWith('image/'))
}
