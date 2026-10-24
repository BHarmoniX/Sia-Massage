// Gentle fade-up as elements marked data-reveal scroll into view. Elements are only
// hidden when scripting is on and motion is welcome (see the CSS in index.astro), so the
// page is fully readable without JavaScript or with reduced motion.

const items = document.querySelectorAll<HTMLElement>('[data-reveal]');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  );
  for (const item of items) observer.observe(item);
} else {
  for (const item of items) item.classList.add('is-visible');
}
