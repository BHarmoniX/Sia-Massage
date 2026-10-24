// Scroll-spy for one-page sites: as the visitor scrolls, the header link for the section
// in view gets aria-current="location" (highlighted, and announced by screen readers), and
// the address bar follows the section so it can be shared or bookmarked.
// Replaces history entries rather than adding them, so Back still leaves the page.

const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section][id]'));
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'));

function setCurrent(id: string | null) {
  for (const link of links) {
    const target = link.hash.slice(1);
    if (id && target === id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  const hash = id ? `#${id}` : '';
  if (location.hash !== hash) {
    history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
  }
}

if (sections.length > 0 && 'IntersectionObserver' in window) {
  const visible = new Map<string, number>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) visible.set(entry.target.id, entry.intersectionRatio);
      // The section occupying most of the middle band of the screen wins.
      let best: string | null = null;
      let bestRatio = 0;
      for (const [id, ratio] of visible) {
        if (ratio > bestRatio) [best, bestRatio] = [id, ratio];
      }
      // At the very top, no section is "current" (the hero/welcome is the page itself).
      setCurrent(window.scrollY < 40 ? null : best);
    },
    { rootMargin: '-35% 0px -35% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  for (const section of sections) observer.observe(section);

  // Returning to the top doesn't always cross a section boundary, so check it directly.
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (window.scrollY < 40) setCurrent(null);
      });
    },
    { passive: true },
  );
}
