// Capture guard (live sites only; switched on in config/features.mjs, marked on <html> by
// BaseLayout). A browser's "full size screenshot" works by making the window as tall as the
// whole page for a moment. No real screen is that tall, so when the window is both far taller
// than the screen and tall enough to show the entire page at once, the page hides its content
// and shows only the frosted footer glass and the design notice (styles in global.css).
//
// This deters casual full-page copying of the design. It cannot stop ordinary screenshots,
// screen recording or reading the page's code; nothing on the web can.

const root = document.documentElement;

if (root.hasAttribute('data-capture-guard')) {
  // The notice text comes from the studio settings, via the attribute BaseLayout sets.
  const notice = root.getAttribute('data-capture-notice') ?? '';
  root.style.setProperty('--capture-notice', JSON.stringify(notice));

  const check = () => {
    const screenHeight = Math.max(window.screen.height, window.screen.availHeight, 1);
    const pageHeight = root.scrollHeight;
    const capturing = window.innerHeight > screenHeight * 1.75 && window.innerHeight >= pageHeight - 4;
    root.toggleAttribute('data-capture-blocked', capturing);
  };

  check();
  // A resize observer reacts before the next paint, so the hidden state is in place by the
  // time a capture is drawn.
  new ResizeObserver(check).observe(root);
  window.addEventListener('resize', check);
}
