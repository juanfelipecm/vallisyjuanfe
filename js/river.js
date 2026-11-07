/* ============================================================
   El río: una mancha de acuarela que recorre la página y va
   apareciendo con el scroll. La flora (acuarelas propias) florece
   a sus orillas.

   - Un trazado maestro invisible da la geometría (puntos de paso
     tomados de las secciones: el río curva al lado contrario del
     contenido).
   - El río visible se pinta por tramos (SVG por cada ~900 px) con
     un filtro de acuarela: ondulación del contorno, temblor fino
     del borde y floraciones. Cada tramo comparte el mismo sistema
     de coordenadas, así el ruido es continuo entre tramos.
   - Aparece revelando la altura del contenedor con un frente
     difuminado hacia la arena. Nada se anima dentro del agua.
   ============================================================ */
(function () {
  const stage = document.querySelector('.stage');
  const reveal = document.getElementById('river-reveal');
  const master = document.getElementById('river-master');
  const floraRoot = document.getElementById('flora');
  if (!stage || !reveal || !master) return;
  const masterPath = master.querySelector('path');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Flora: pieza, posición a lo largo del río (0..1), lado y tamaño --- */
  const FLORA = [
    { at: .05, side: -1, dist: 230, w: 420, src: 'copa-03', speed: .05, rot: -8 },
    { at: .08, side:  1, dist: 150, w: 150, src: 'palma-02', speed: .11, rot: 20 },
    { at: .14, side:  1, dist: 220, w: 380, src: 'copa-01', speed: .05, rot: 12 },
    { at: .19, side: -1, dist: 170, w: 160, src: 'palma-01', speed: .10, rot: -30 },
    { at: .25, side: -1, dist: 260, w: 520, src: 'copa-06', speed: .04, rot: 5 },
    { at: .31, side:  1, dist: 180, w: 300, src: 'copa-05', speed: .07, rot: 60 },
    { at: .37, side:  1, dist: 240, w: 440, src: 'copa-04', speed: .05, rot: -10 },
    { at: .43, side: -1, dist: 160, w: 140, src: 'palma-03', speed: .12, rot: 15 },
    { at: .49, side: -1, dist: 300, w: 760, src: 'selva-02', speed: .03, rot: 0, dim: .8 },
    { at: .56, side:  1, dist: 200, w: 380, src: 'copa-02', speed: .06, rot: -4 },
    { at: .62, side:  1, dist: 150, w: 170, src: 'palma-04', speed: .11, rot: -45 },
    { at: .68, side: -1, dist: 240, w: 460, src: 'copa-03', speed: .05, rot: 170 },
    { at: .74, side:  1, dist: 250, w: 480, src: 'copa-06', speed: .04, rot: -14 },
    { at: .80, side: -1, dist: 160, w: 150, src: 'palma-02', speed: .10, rot: 80 },
    { at: .86, side:  1, dist: 320, w: 760, src: 'selva-02', speed: .03, rot: 180, dim: .8 },
    { at: .92, side: -1, dist: 220, w: 400, src: 'copa-01', speed: .05, rot: 30 },
    { at: .97, side:  1, dist: 230, w: 420, src: 'copa-04', speed: .05, rot: -20 },
  ];

  let L = 0, items = [], docH = 0, current = 0, target = 0, raf = null, W = 0, H = 0;
  const clamp = (v) => Math.min(1, Math.max(0, v));

  /* --- Puntos de paso a partir de las secciones ----------------------- */
  function waypoints() {
    const cx = W / 2;
    const narrow = W < 900;
    const amp = narrow ? Math.min(W * 0.26, 120) : Math.min(W * 0.22, 300);
    const pts = [];
    const hero = stage.querySelector('.hero');
    const heroEnd = hero ? hero.offsetTop + hero.offsetHeight : 0;
    pts.push({ x: cx + amp * 0.15, y: heroEnd - 140 });
    stage.querySelectorAll('[data-river]').forEach((sec) => {
      const side = sec.dataset.river === 'left' ? 1 : sec.dataset.river === 'right' ? -1 : 0;
      const y0 = sec.offsetTop, h = sec.offsetHeight;
      pts.push({ x: cx + side * amp * 0.4, y: y0 + h * 0.15 });
      pts.push({ x: cx + side * amp, y: y0 + h * 0.5 });
      pts.push({ x: cx + side * amp * 0.5, y: y0 + h * 0.88 });
    });
    pts.push({ x: cx, y: H + 80 });
    return pts;
  }

  /* --- Catmull-Rom -> Bézier (curva continua y suave) ---------------- */
  function smoothPath(p) {
    let d = `M ${p[0].x} ${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const t = 1.1;
      const c1x = p1.x + (p2.x - p0.x) / 6 * t, c1y = p1.y + (p2.y - p0.y) / 6 * t;
      const c2x = p2.x - (p3.x - p1.x) / 6 * t, c2y = p2.y - (p3.y - p1.y) / 6 * t;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  /* --- Tramos de río pintados con filtro de acuarela ------------------ */
  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }

  // Los tramos se pintan a medida que el río se revela (cada filtro de acuarela
  // es caro de rasterizar); `painted` cuenta los tramos ya creados.
  const CHUNK = 900, M = 160;                    // alto del tramo y margen del filtro
  let riverD = '', painted = 0, paintedW = 0;

  function resetRiver(d) {
    riverD = d; painted = 0; paintedW = W;
    reveal.querySelectorAll('svg.river').forEach((s) => s.remove());
  }

  function paintUpTo(y) {
    const need = Math.min(Math.ceil(H / CHUNK), Math.ceil(Math.max(0, y) / CHUNK));
    while (painted < need) paintChunk(painted++);
  }

  function paintChunk(i) {
    const d = riverD, top = i * CHUNK;
    const narrow = W < 900;
    const k = narrow ? 0.62 : 1;               // grosor en móvil
    const h = Math.min(CHUNK, H - top);
    const svg = el('svg', { class: 'river', viewBox: `0 ${top} ${W} ${h}`, width: W, height: h, 'aria-hidden': 'true' });
    svg.style.top = `${top}px`;
    const defs = el('defs', {});
    // Ambos filtros comparten el meandro grande (misma semilla) para que el agua
    // viva dentro de su orilla; difieren en la variación de ancho y el temblor fino.
    defs.appendChild(filter(`wc-bank-${i}`, top - M, h + 2 * M, { big: [0.0028, 52 * k, 3], mid: [0.016, 18 * k, 41], fine: [0.11, 5 * k, 52], bloom: [0.005, 0.2, 63] }));
    defs.appendChild(filter(`wc-water-${i}`, top - M, h + 2 * M, { big: [0.0028, 52 * k, 3], mid: [0.02, 12 * k, 44], fine: [0.14, 3.5 * k, 55], bloom: [0.012, 0.4, 66] }));
    svg.appendChild(defs);

    const gBank = el('g', { filter: `url(#wc-bank-${i})` });
    gBank.appendChild(el('path', { d, class: 'river__bank', 'stroke-width': 84 * k }));
    gBank.appendChild(el('path', { d, class: 'river__bank-deep', 'stroke-width': 46 * k, transform: `translate(${7 * k} ${4 * k})` }));
    const gWater = el('g', { filter: `url(#wc-water-${i})` });
    gWater.appendChild(el('path', { d, class: 'river__water-rim', 'stroke-width': 24 * k, transform: `translate(${2 * k} ${1 * k})` }));
    gWater.appendChild(el('path', { d, class: 'river__water', 'stroke-width': 17 * k }));
    gWater.appendChild(el('path', { d, class: 'river__water-light', 'stroke-width': 7 * k, transform: `translate(${-4 * k} ${2 * k})` }));
    gWater.appendChild(el('path', { d, class: 'river__pigment', 'stroke-width': 3.5 * k, transform: `translate(${8 * k} ${-1 * k})` }));
    svg.appendChild(gBank); svg.appendChild(gWater);
    reveal.appendChild(svg);
  }

  /* filtro de acuarela: meandro + variación de ancho + temblor fino + floraciones */
  function filter(id, y, h, o) {
    const f = el('filter', { id, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', x: -200, y, width: W + 400, height: h, 'color-interpolation-filters': 'sRGB' });
    let src = 'SourceGraphic';
    [['big', o.big], ['mid', o.mid], ['fine', o.fine]].forEach(([name, [freq, scale, seed]]) => {
      f.appendChild(el('feTurbulence', { type: 'fractalNoise', baseFrequency: freq, numOctaves: 2, seed, result: `n-${name}` }));
      f.appendChild(el('feDisplacementMap', { in: src, in2: `n-${name}`, scale, xChannelSelector: 'R', yChannelSelector: 'G', result: `d-${name}` }));
      src = `d-${name}`;
    });
    const [bf, bmin, bseed] = o.bloom;
    f.appendChild(el('feTurbulence', { type: 'fractalNoise', baseFrequency: bf, numOctaves: 3, seed: bseed, result: 'bloom' }));
    f.appendChild(el('feColorMatrix', { in: 'bloom', type: 'luminanceToAlpha', result: 'bloomA' }));
    const ct = el('feComponentTransfer', { in: 'bloomA', result: 'bloomB' });
    ct.appendChild(el('feFuncA', { type: 'table', tableValues: `${bmin} 1 1` }));
    f.appendChild(ct);
    f.appendChild(el('feComposite', { in: src, in2: 'bloomB', operator: 'in' }));
    return f;
  }

  function build() {
    W = stage.clientWidth; H = stage.offsetHeight;
    master.setAttribute('viewBox', `0 0 ${W} ${H}`);
    master.setAttribute('width', W); master.setAttribute('height', H);
    reveal.style.height = `${H}px`;
    const d = smoothPath(waypoints());
    masterPath.setAttribute('d', d);
    L = masterPath.getTotalLength();
    // Solo se vuelve a pintar si la geometría cambió (fuentes, imágenes, resize).
    if (d !== riverD || W !== paintedW) { resetRiver(d); paintUpTo(current + window.innerHeight); }
    docH = document.documentElement.scrollHeight - window.innerHeight;
    placeFlora();
  }

  function placeFlora() {
    if (!floraRoot) return;
    if (!items.length) {
      FLORA.forEach((f) => {
        const div = document.createElement('div');
        div.className = 'flora__item';
        div.innerHTML = `<picture><source srcset="assets/img/wc/${f.src}.webp" type="image/webp"><img src="assets/img/wc/${f.src}.png" alt="" loading="lazy" decoding="async"></picture>`;
        floraRoot.appendChild(div);
        items.push({ ...f, el: div });
      });
    }
    const scale = W < 900 ? 0.55 : 1;
    // lado del río en cada sección (+1: el río va a la derecha del contenido)
    const zones = [...stage.querySelectorAll('[data-river]')].map((sec) => ({
      y0: sec.offsetTop, y1: sec.offsetTop + sec.offsetHeight,
      side: sec.dataset.river === 'left' ? 1 : sec.dataset.river === 'right' ? -1 : 0,
    }));
    items.forEach((it) => {
      const pt = masterPath.getPointAtLength(it.at * L);
      const w = it.w * scale;
      // las piezas grandes se van siempre al lado del río que no tiene contenido
      let side = it.side;
      if (it.w >= 250 && W >= 900) {
        const z = zones.find((z) => pt.y >= z.y0 && pt.y <= z.y1);
        if (z && z.side) side = z.side;
      }
      it.x = pt.x + side * it.dist * scale - w / 2;
      it.y = pt.y - w / 2;
      it.el.style.width = `${w}px`;
      it.el.style.left = `${it.x}px`;
      it.el.style.top = `${it.y}px`;
      it.el.style.setProperty('--rot', `${it.rot}deg`);
    });
  }

  /* --- Scroll: el río aparece, la flora florece ----------------------- */
  function onScroll() {
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;
    target = window.scrollY + window.innerHeight * 0.9 - stageTop;
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    raf = null;
    const k = reduceMotion ? 1 : 0.08;
    current += (target - current) * k;
    reveal.style.setProperty('--r', `${Math.max(0, Math.min(H, current))}px`);
    paintUpTo(current + window.innerHeight);

    const sy = window.scrollY, vh = window.innerHeight;
    const stageTop = stage.getBoundingClientRect().top + sy;
    items.forEach((it) => {
      const absY = stageTop + it.y + it.w / 2;
      const rel = (absY - sy) / vh;
      let o = 0;
      if (rel < 1.1 && rel > -0.15) o = Math.min(clamp((1.1 - rel) / 0.35), clamp((rel + 0.15) / 0.35));
      const eased = o * o * (3 - 2 * o);
      const drift = reduceMotion ? 0 : (rel - 0.5) * -vh * it.speed;
      const grow = 0.94 + 0.06 * eased;
      it.el.style.opacity = (eased * (it.dim || 1)).toFixed(3);
      it.el.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0) rotate(var(--rot)) scale(${grow.toFixed(3)})`;
    });
    if (Math.abs(target - current) > 0.5) raf = requestAnimationFrame(tick);
  }

  let rt;
  function rebuild() { clearTimeout(rt); rt = setTimeout(() => { build(); onScroll(); }, 150); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  window.addEventListener('load', rebuild);
  build(); onScroll();
  if ('ResizeObserver' in window) {
    let lastH = 0;
    new ResizeObserver(() => { const h = stage.offsetHeight; if (Math.abs(h - lastH) > 4) { lastH = h; rebuild(); } }).observe(stage);
  }
})();
