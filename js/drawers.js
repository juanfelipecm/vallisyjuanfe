/* ============================================================
   Drawers: paneles que entran suavemente desde el costado.
   <button data-drawer-open="id">  ·  <aside class="drawer" id="id">
   ============================================================ */
(function () {
  const backdrop = document.querySelector('.drawer-backdrop');
  let open = null, lastFocus = null;

  function show(id) {
    const d = document.getElementById(id);
    if (!d) return;
    lastFocus = document.activeElement;
    open = d;
    d.setAttribute('aria-hidden', 'false');
    backdrop && backdrop.classList.add('is-open');
    document.body.classList.add('drawer-open');
    const first = d.querySelector('.drawer__close');
    setTimeout(() => first && first.focus(), 400);
  }
  function hide() {
    if (!open) return;
    open.setAttribute('aria-hidden', 'true');
    backdrop && backdrop.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    lastFocus && lastFocus.focus && lastFocus.focus();
    open = null;
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-drawer-open]');
    if (opener) { e.preventDefault(); show(opener.dataset.drawerOpen); return; }
    if (e.target.closest('[data-drawer-close]') || e.target === backdrop) hide();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  document.querySelectorAll('.drawer').forEach((d) => d.setAttribute('aria-hidden', 'true'));
})();
