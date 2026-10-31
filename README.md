# Valeria & Juan Felipe · 13.02.2027 · Palomino

Sitio web del matrimonio. Estático, sin build: HTML + CSS + JS vanilla.
Se puede publicar tal cual en GitHub Pages, Netlify o Vercel.

## Estructura

```
index.html            Página principal (hero, itinerario, cómo llegar, hospedaje, vestir, recomendaciones, RSVP)
design-system.html    Design system: paleta, tipografía, universo gráfico, componentes, movimiento
css/tokens.css        Variables: colores, tipografía, espacio, radios, movimiento
css/base.css          Reset, papel, escala tipográfica, utilidades
css/components.css    Botones, chips, papel, timeline, facts, drawers, reveal
css/site.css          Nav, escenario del río, hero, secciones, footer
js/river.js           Dibuja el río siguiendo las secciones y lo revela con el scroll; coloca la flora
js/drawers.js         Paneles laterales
js/main.js            Reveal al hacer scroll, nav, cuenta regresiva
assets/img/           Acuarela, logo, invitación, save the date, moodboard, sprites recortados
```

## Cómo verlo

Cualquier servidor estático sirve:

```bash
python3 -m http.server 4173
```

y abrir http://localhost:4173

## Pendientes de contenido

- Número de WhatsApp y teléfono en la sección "Confirma tu asistencia" (buscar `57XXXXXXXXXX`).
- Texto de introducción a Palomino en "Cómo llegar".
- Ubicación y enlace de los hoteles Casa Coraje, Naio y Pavo Real.
- Fotos de referencia para los drawers de "Cómo vestirse" (`assets/img/vestir/`).
- Ubicación exacta de la Bomba La Sierrita y del Hotel One Santuario en el mapa.
