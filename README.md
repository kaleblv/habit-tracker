# Hábitos — PWA de seguimiento de hábitos

Tracker offline-first para construir rachas diarias. Funciona sin conexión después de la primera carga.

## Características

- Crear hábitos con emoji y color personalizado
- Dashboard con los últimos 7 días y racha actual
- Vista de detalle con calendario mensual navegable
- Marcar/desmarcar días pasados directamente en el calendario
- Estadísticas: racha actual, mejor racha, total acumulado
- 100% offline gracias al service worker
- Instalable como app nativa (PWA)

## Deploy a Netlify

### Opción 1 — Drag & drop
1. Ve a https://app.netlify.com
2. Arrastra la carpeta `habitos-pwa` al área de deploy
3. Listo — Netlify te da una URL tipo `https://xxx.netlify.app`

### Opción 2 — Netlify CLI
```bash
npm install -g netlify-cli
netlify deploy --dir habitos-pwa --prod
```

### Opción 3 — GitHub
1. Sube la carpeta como repositorio en GitHub
2. Conecta el repo en Netlify (Publish directory: `.` o la raíz del repo)
3. Auto-deploy en cada push

## Estructura

```
habitos-pwa/
├── index.html       # Shell de la app
├── styles.css       # Estilos (tema oscuro violeta)
├── app.js           # Lógica de la SPA
├── sw.js            # Service worker (cache-first)
├── manifest.json    # PWA manifest
└── icon.svg         # Ícono de la app
```

## Datos

Todo se guarda en `localStorage` bajo la clave `habitos_v1`. Los datos son locales al dispositivo/navegador.

## Notas técnicas

- No requiere servidor backend ni base de datos
- Compatible con Chrome, Safari (iOS), Firefox, Edge
- En iOS, instalar vía "Agregar a pantalla de inicio" en Safari
- El service worker solo funciona en HTTPS (Netlify lo da por defecto)
