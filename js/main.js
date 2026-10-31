/* ============================================================
   Aparición de contenido, navegación y cuenta regresiva
   ============================================================ */
(function () {
  if (location.search.includes('debug-river')) document.body.classList.add('debug-river');
  /* reveal al entrar en pantalla */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* nav: fondo al hacer scroll + sección actual */
  const nav = document.querySelector('.nav');
  const links = [...document.querySelectorAll('.nav__links a')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40);
    let cur = null;
    sections.forEach((s) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.45) cur = s; });
    links.forEach((a) => a.classList.toggle('is-current', cur && a.getAttribute('href') === `#${cur.id}`));
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* cuenta regresiva hasta la ceremonia (hora de Colombia) */
  const count = document.getElementById('countdown');
  if (count) {
    const target = new Date('2027-02-13T16:00:00-05:00').getTime();
    const days = Math.max(0, Math.ceil((target - Date.now()) / 86400000));
    count.textContent = days === 0 ? 'Hoy es el día' : days === 1 ? 'Falta 1 día' : `Faltan ${days} días`;
  }
})();
