// El 403 de la puerta, en un solo lugar (§8.7).
//
// Los tres 403 de la puerta no son errores que el usuario pueda corregir reintentando: son
// tres estados con tres salidas distintas —pedir una invitación, contratar, pedirle la app
// al dueño—. Un toast que dice "Error 403" los tapa a los tres y deja a la persona sin
// saber qué hacer.
//
// `useApi` deja acá el último 403 con código que devolvió el back, y el layout muestra la
// pantalla correspondiente. Vive en `useState` para que sea el mismo valor en toda la app
// (cualquier store puede provocarlo desde cualquier pantalla).
export const useAppBlock = () => useState('appBlock', () => null)

// Etiquetas de cada estado. El texto de `message` viene del back —es el que nombra al dueño
// al que hay que pedirle la app— y se muestra tal cual: repetirlo acá lo dejaría desfasado.
export const APP_BLOCK_TITLES = {
  es: {
    APP_NOT_ASSIGNED:  'No tienes esta app asignada',
    APP_NOT_ENABLED:   'Tu organización no tiene esta app',
    APP_TRIAL_EXPIRED: 'El período de prueba terminó',
  },
  en: {
    APP_NOT_ASSIGNED:  'This app is not assigned to you',
    APP_NOT_ENABLED:   'Your organization does not have this app',
    APP_TRIAL_EXPIRED: 'The trial period ended',
  },
}
