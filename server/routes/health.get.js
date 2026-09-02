// Qué versión del front está sirviendo Railway.
//
// Existe por lo que pasó el 2-sep-2026 con el front de Relations: su build falló durante
// siete commits seguidos y el servicio siguió "Online", sirviendo la versión anterior. Se
// dieron por desplegados cambios que no estaban en producción, y no había forma de notarlo
// desde afuera.
//
// Acá hace falta el doble, porque este front está en plena migración de Vercel a Railway:
// sin esto no hay manera de saber cuál de las dos plataformas contestó, ni qué versión.
//
// Un `curl https://calendar.unabase.com/health` ahora contesta qué commit corre. Es la
// misma idea que en el back: convertir "creo que se desplegó" en un dato.
//
// Vive en `server/routes` y funciona igual con `ssr: false`: Nitro sigue corriendo para
// servir la SPA, así que sus rutas responden normalmente.
export default defineEventHandler(() => {
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || null;
  return {
    ok: true,
    service: "calendar-front",
    env: process.env.NODE_ENV || null,
    commit: commit ? commit.slice(0, 7) : null,
  };
});
