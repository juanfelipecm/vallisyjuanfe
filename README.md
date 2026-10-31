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
assets/img/           Logo, invitación, save the date, moodboard, acuarela original (referencia)
assets/img/wc/        Acuarelas propias generadas: copas, palmas y selvas
tools/watercolor.py   Generador de acuarelas (python3 tools/watercolor.py; requiere numpy y Pillow)
tools/serve.py        Servidor estático de desarrollo sin caché
```

## Cómo verlo

Cualquier servidor estático sirve. Para desarrollo (sin caché):

```bash
python3 tools/serve.py 4173
```

y abrir http://localhost:4173

## Pendientes de contenido

- Texto de introducción a Palomino en "Cómo llegar".
- Fotos de referencia para el drawer de Hombres en "Cómo vestirse" (`assets/img/vestir/`); las de Mujeres ya están.
- Ubicación exacta de la Bomba La Sierrita en el mapa (hoy es una búsqueda en Google Maps).
