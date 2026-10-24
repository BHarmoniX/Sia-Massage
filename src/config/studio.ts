// Illuminara Creative Studio: the developer credit that appears on every client site
// (footer "Digital Services" menu and the /digital-services page). Base-owned: change it
// here, in the base repo, and every client picks it up with `npm run update-base`.

export const studio = {
  name: 'Illuminara Creative Studio',
  tagline: 'Durable, immersive web experiences that load at optimal speed',
  footerMenuTitle: 'Digital Services',
  creditLabel: 'Website Developer/Designer',
  page: '/digital-services',
  /** Public enquiry address for the studio. Leave undefined to hide the email link. */
  email: undefined as string | undefined,
} as const;
