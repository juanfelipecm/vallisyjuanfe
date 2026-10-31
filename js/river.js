/* ============================================================
   El río: un trazo SVG que recorre la página y se revela con
   el scroll. La flora (sprites de acuarela) florece a su lado.
   ============================================================ */
(function () {
  const stage = document.querySelector('.stage');
  const svg = document.getElementById('river');
  const floraRoot = document.getElementById('flora');
  if (!stage || !svg) return;

  const paths = {
    bank:  svg.querySelector('.river__bank'),
    water: svg.querySelector('.river__water'),
    line:  svg.querySelector('.river__line'),
    glint: svg.querySelector('.river__glint'),
    mask:  svg.querySelector('.river__mask'),
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Flora: qué aparece, dónde (0..1 a lo largo del río) ----- */
  const FLORA = [
    { at: .06, side: -1, dist: 160, w: 340, src: 'copa-01', speed: .06, rot: -6 },
    { at: .09, side:  1, dist: 120, w: 110, src: 'palma-02', speed: .12, rot: 20 },
    { at: .16, side:  1, dist: 180, w: 300, src: 'copa-05', speed: .05, rot: 8 },
    { at: .22, side: -1, dist: 140, w: 120, src: 'palma-01', speed: .10, rot: -30 },
    { at: .28, side: -1, dist: 200, w: 360, src: 'copa-02', speed: .04, rot: 4 },
    { at: .33, side:  1, dist: 110, w:  95, src: 'palma-03', speed: .13, rot: 60 },
    { at: .40, side:  1, dist: 190, w: 280, src: 'copa-03', speed: .06, rot: -10 },
    { at: .46, side: -1, dist: 130, w: 100, src: 'palma-04', speed: .11, rot: 15 },
    { at: .53, side: -1, dist: 170, w: 320, src: 'copa-06', speed: .05, rot: 12 },
    { at: .59, side:  1, dist: 150, w: 170, src: 'copa-04', speed: .08, rot: -4 },
    { at: .66, side:  1, dist: 120, w: 110, src: 'palma-02', speed: .12, rot: -45 },
    { at: .72, side: -1, dist: 190, w: 340, src: 'copa-01', speed: .05, rot: 170 },
    { at: .78, side:  1, dist: 200, w: 300, src: 'copa-05', speed: .04, rot: -14 },
    { at: .84, side: -1, dist: 120, w: 100, src: 'palma-01', speed: .10, rot: 80 },
    { at: .90, side:  1, dist: 160, w: 280, src: 'copa-03', speed: .06, rot: 30 },
    { at: .95, side: -1, dist: 180, w: 300, src: 'copa-02', speed: .05, rot: -20 },
  ];

  let L = 0, items = [], docH = 0, current = 0, target = 0, raf = null;

  /* --- Construye los puntos de paso a partir de las secciones ---- */
  function waypoints() {
    const W = stage.clientWidth;
    const rect = stage.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const pts = [];
    const cx = W / 2;
    const amp = Math.min(W * 0.22, 300);
    const narrow = W < 900;

    const hero = stage.querySelector('.hero');
    pts.push({ x: cx, y: hero ? hero.offsetTop + hero.offsetHeight * 0.55 : 0 });

    stage.querySelectorAll('[data-river]').forEach((sec) => {
      const side = sec.dataset.river === 'left' ? 1 : sec.dataset.river === 'right' ? -1 : 0; // el río va al lado contrario del contenido
      const y0 = sec.offsetTop, h = sec.offsetHeight;
      const x = narrow ? cx + side * amp * 0.5 : cx + side * amp;
      pts.push({ x: cx + side * amp * 0.35, y: y0 + h * 0.12 });
      pts.push({ x, y: y0 + h * 0.5 });
      pts.push({ x: cx + side * amp * 0.45, y: y0 + h * 0.9 });
    });

    pts.push({ x: cx, y: stage.offsetHeight + 60 });
    return pts;
  }

  /* --- Catmull-Rom -> Bézier cúbica (curva suave) --------------- */
  function smoothPath(p) {
    if (p.length < 2) return '';
    let d = `M ${p[0].x} ${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const t = 0.55;
      const c1x = p1.x + (p2.x - p0.x) / 6 * t * 2, c1y = p1.y + (p2.y - p0.y) / 6 * t * 2;
      const c2x = p2.x - (p3.x - p1.x) / 6 * t * 2, c2y = p2.y - (p3.y - p1.y) / 6 * t * 2;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function build() {
    const W = stage.clientWidth, H = stage.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    const d = smoothPath(waypoints());
    Object.values(paths).forEach((p) => p && p.setAttribute('d', d));
    L = paths.water.getTotalLength();
    ['bank', 'water', 'line', 'mask'].forEach((k) => {
      paths[k].style.strokeDasharray = `${L}`;
      paths[k].style.strokeDashoffset = `${L}`;
    });
    docH = document.documentElement.scrollHeight - window.innerHeight;
    placeFlora(W);
  }

  function placeFlora(W) {
    if (!floraRoot) return;
    if (!items.length) {
      FLORA.forEach((f) => {
        const el = document.createElement('div');
        el.className = 'flora__item';
        el.innerHTML = `<img src="assets/img/sprites/${f.src}.png" alt="" loading="lazy" decoding="async">`;
        floraRoot.appendChild(el);
        items.push({ ...f, el });
      });
    }
    const scale = W < 900 ? 0.7 : 1.15;
    items.forEach((it) => {
      const pt = paths.water.getPointAtLength(it.at * L);
      const w = it.w * scale;
      it.x = pt.x + it.side * it.dist * scale - w / 2;
      it.y = pt.y - w / 2;
      it.el.style.width = `${w}px`;
      it.el.style.left = `${it.x}px`;
      it.el.style.top = `${it.y}px`;
      it.el.style.setProperty('--rot', `${it.rot}deg`);
    });
  }

  /* --- Scroll: revela el trazo y hace florecer la flora --------- */
  function onScroll() { target = Math.min(1, Math.max(0, (window.scrollY + window.innerHeight * 0.82) / (docH + window.innerHeight))); if (!raf) raf = requestAnimationFrame(tick); }

  function tick() {
    raf = null;
    const k = reduceMotion ? 1 : 0.07;              // inercia: el río fluye, no salta
    current += (target - current) * k;
    const reveal = L * current;
    ['bank', 'water', 'line', 'mask'].forEach((key) => { paths[key].style.strokeDashoffset = `${Math.max(0, L - reveal)}`; });

    const sy = window.scrollY, vh = window.innerHeight;
    const stageTop = stage.getBoundingClientRect().top + sy;
    items.forEach((it) => {
      const absY = stageTop + it.y + (it.w / 2);
      const rel = (absY - sy) / vh;                  // 0 = arriba de la ventana, 1 = abajo
      // florece entre 1.05 y 0.75, se desvanece entre 0.25 y -0.05
      let o = 0;
      if (rel < 1.05 && rel > -0.1) {
        const inA = clamp((1.05 - rel) / 0.3), outA = clamp((rel + 0.05) / 0.3);
        o = Math.min(inA, outA);
      }
      const eased = o * o * (3 - 2 * o);
      const drift = reduceMotion ? 0 : (rel - 0.5) * -vh * it.speed;   // parallax suave
      const grow = 0.92 + 0.08 * eased;
      it.el.style.opacity = eased.toFixed(3);
      it.el.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0) rotate(var(--rot)) scale(${grow.toFixed(3)})`;
    });

    if (Math.abs(target - current) > 0.0005) raf = requestAnimationFrame(tick);
  }
  const clamp = (v) => Math.min(1, Math.max(0, v));

  let rt;
  function rebuild() { clearTimeout(rt); rt = setTimeout(() => { build(); onScroll(); }, 120); }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  window.addEventListener('load', rebuild);
  build(); onScroll();
  // por si cambia la altura del documento (drawers, imágenes tardías)
  if ('ResizeObserver' in window) new ResizeObserver(rebuild).observe(stage);
})();
