// "Back to …" links on separate pages (legal, studio): if the visitor came from this site,
// go back in history so they land exactly where they were (the browser restores the scroll
// position). Otherwise (arrived from a search, bookmark or another site) the link's own
// href, the home page, is used as normal.
for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-back-link]')) {
  link.addEventListener('click', (event) => {
    let fromHere = false;
    try {
      fromHere = document.referrer !== '' && new URL(document.referrer).origin === location.origin;
    } catch {
      fromHere = false;
    }
    if (fromHere && history.length > 1) {
      event.preventDefault();
      history.back();
    }
  });
}
