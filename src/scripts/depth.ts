// Drives the depth module (src/styles/depth.css) from the pointer:
//   .btn-3d          light follows the pointer across the button
//   [data-tilt]      tilts toward the pointer; [data-depth] children drift
//   [data-glow]      a tinted light follows the pointer across the surface
// Updates CSS custom properties only (via CSSOM, which the CSP allows), batched per frame.
// Mouse/trackpad only: touch screens keep the static depth and lighting. Off entirely for
// visitors who prefer reduced motion.

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

type Pending = { el: HTMLElement; x: number; y: number };
let pending: Pending | null = null;
let frame = 0;

function apply({ el, x, y }: Pending) {
  const rect = el.getBoundingClientRect();
  const fx = (x - rect.left) / rect.width; // 0..1
  const fy = (y - rect.top) / rect.height;
  el.style.setProperty('--mx', `${(fx * 100).toFixed(1)}%`);
  el.style.setProperty('--my', `${(fy * 100).toFixed(1)}%`);

  // A glowing element inside a tilting one: light the inner surface, tilt the outer.
  const tilter = el.hasAttribute('data-tilt') ? el : el.closest<HTMLElement>('[data-tilt]');
  if (!tilter || reducedMotion.matches) return;
  if (tilter !== el) {
    apply({ el: tilter, x, y });
    return;
  }
  const max = parseFloat(getComputedStyle(el).getPropertyValue('--depth-tilt')) || 8;
  el.style.setProperty('--rx', `${((0.5 - fy) * max * 2).toFixed(2)}deg`);
  el.style.setProperty('--ry', `${((fx - 0.5) * max * 2).toFixed(2)}deg`);
  el.setAttribute('data-tilting', '');

  for (const layer of el.querySelectorAll<HTMLElement | SVGElement>('[data-depth]')) {
    const depth = Number(layer.getAttribute('data-depth')) || 0;
    layer.style.setProperty('--px', ((fx - 0.5) * depth * -40).toFixed(1));
    layer.style.setProperty('--py', ((fy - 0.5) * depth * -40).toFixed(1));
  }
}

function reset(el: HTMLElement) {
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
  el.removeAttribute('data-tilting');
  for (const layer of el.querySelectorAll<HTMLElement | SVGElement>('[data-depth]')) {
    layer.style.setProperty('--px', '0');
    layer.style.setProperty('--py', '0');
  }
}

function onMove(event: PointerEvent) {
  const el = (event.target as Element | null)?.closest<HTMLElement>('.btn-3d, [data-tilt], [data-glow]');
  if (!el) return;
  pending = { el, x: event.clientX, y: event.clientY };
  if (!frame) {
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (pending) apply(pending);
      pending = null;
    });
  }
}

function onLeave(event: PointerEvent) {
  const el = event.target as HTMLElement;
  if (el.matches?.('[data-tilt]')) reset(el);
}

if (finePointer.matches) {
  document.addEventListener('pointermove', onMove, { passive: true });
  // pointerleave doesn't bubble; capture it on each element as it happens.
  document.addEventListener('pointerleave', onLeave, { capture: true, passive: true });
}

// ── Scroll motion ────────────────────────────────────────────────────────────────────

// Reveal: [data-reveal] and .img-reveal get .is-visible once they enter the viewport.
const revealables = document.querySelectorAll<HTMLElement>('[data-reveal], .img-reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );
  for (const el of revealables) io.observe(el);
} else {
  for (const el of revealables) el.classList.add('is-visible');
}

// Parallax drift fallback for browsers without scroll-driven animations.
const drifters = Array.from(document.querySelectorAll<HTMLElement>('.scroll-drift'));
if (
  drifters.length > 0 &&
  !reducedMotion.matches &&
  !CSS.supports('animation-timeline: view()')
) {
  for (const el of drifters) el.classList.add('scroll-drift-js');
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (const el of drifters) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) continue;
      // -1 as it enters at the bottom, +1 as it leaves at the top.
      const progress = 1 - (rect.top + rect.height) / (vh + rect.height);
      el.style.setProperty('--drift', `${((progress * 2 - 1) * 7).toFixed(2)}%`);
    }
  };
  update();
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
}

// Horizontal pan fallback (.scroll-pan) for browsers without scroll-driven animations.
const panners = Array.from(document.querySelectorAll<HTMLElement>('.scroll-pan'));
if (panners.length > 0 && !reducedMotion.matches && !CSS.supports('animation-timeline: view()')) {
  for (const el of panners) el.classList.add('scroll-pan-js');
  let queued = false;
  const pan = () => {
    queued = false;
    const vh = window.innerHeight;
    for (const el of panners) {
      const frame = el.parentElement ?? el;
      const rect = frame.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) continue;
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      const ratio = parseFloat(getComputedStyle(el).getPropertyValue('--pan-ratio')) || 1.8;
      el.style.setProperty('--pan', `${(progress * (100 / ratio - 100)).toFixed(2)}%`);
    }
  };
  pan();
  window.addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(pan);
      }
    },
    { passive: true },
  );
}
