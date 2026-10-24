// The one file to fill in per client. Everything client-specific — name, contact details,
// links, legal pages — is read from here, so a value is never hard-coded twice.
// It is validated at build time: a malformed phone, email or URL stops the build.

import { z } from 'zod';

const auPhone = z
  .string()
  .regex(/^(\+61|0)[2-478]( ?\d){8}$/, 'Use an Australian number, e.g. 0468 865 876 or +61 7 3000 0000');

/** ATO checksum: subtract 1 from the first digit, weight, sum, divisible by 89. */
export function isValidAbn(abn: string): boolean {
  const digits = abn.replace(/\s/g, '').split('').map(Number);
  if (digits.length !== 11 || digits.some(Number.isNaN)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  digits[0]! -= 1;
  return digits.reduce((sum, d, i) => sum + d * weights[i]!, 0) % 89 === 0;
}

const abn = z
  .string()
  .regex(/^\d{2} ?\d{3} ?\d{3} ?\d{3}$/, 'ABN is 11 digits, e.g. 51 824 753 556')
  .refine(isValidAbn, 'ABN fails the ATO checksum. Check it for a typo.')
  .optional();

const link = z.object({
  label: z.string().min(1),
  // Site paths, page anchors, or https links only. Blocks javascript: and data: URLs.
  href: z.string().regex(/^(\/|#|https:\/\/|mailto:|tel:)/, 'Links must start with /, #, https://, mailto: or tel:'),
});

export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'tiktok',
  'youtube',
  'x',
  'google',
] as const;

export const siteSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().default(''),
  description: z.string().min(1).max(160, 'Keep the meta description under 160 characters'),
  url: z.url({ protocol: /^https$/ }),
  locale: z.string().default('en-AU'),
  timezone: z.string().default('Australia/Brisbane'),
  currency: z.string().length(3).default('AUD'),
  business: z.object({
    legalName: z.string().min(1),
    abn,
    phone: auPhone.optional(),
    email: z.email().optional(),
    address: z
      .object({
        street: z.string(),
        suburb: z.string(),
        state: z.enum(['QLD', 'NSW', 'VIC', 'TAS', 'SA', 'WA', 'NT', 'ACT']),
        postcode: z.string().regex(/^\d{4}$/),
      })
      .optional(),
    /** Shown where there's no public street address, e.g. "Service area: Moreton Bay". */
    serviceArea: z.string().optional(),
    /** Opening hours as shown to visitors, e.g. "Open 7 days 9am–11pm". */
    hours: z.string().optional(),
  }),
  /** Logo in /public (SVG or WebP). Without one, the footer shows the name as a wordmark. */
  logo: z
    .object({
      src: z.string().regex(/^\//),
      alt: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  /**
   * Social and business profiles, shown as icons on the right of the footer. Leave href out
   * while the real profile isn't known yet: the icon shows as a placeholder, and a
   * production build refuses to go live until every placeholder has a real link.
   */
  social: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        href: z.url({ protocol: /^https$/ }).optional(),
      }),
    )
    .default([]),
  /**
   * Header navigation. On a one-page site use section anchors ('#services'); the header
   * turns them into '/#services' on other pages (legal pages) automatically.
   */
  nav: z.array(link).default([]),
  /** Header call-to-action button, e.g. { label: 'Book now', href: '#contact' }. */
  cta: link.optional(),
  /**
   * Footer fold-out menus, in order. Nav links appear as "Quick Links" automatically, and
   * the Illuminara "Digital Services" credit is always added last.
   */
  footerMenus: z
    .array(z.object({ title: z.string().min(1), links: z.array(link).min(1) }))
    .default([]),
  /**
   * Ambient brand music: a floating play/pause button. The track lives in /public/audio
   * and must be licensed for commercial use. Omit to switch the feature off.
   */
  audio: z
    .object({
      src: z.string().regex(/^\/audio\/[\w.-]+\.(mp3|m4a|ogg|webm)$/, 'Put the track in /public/audio'),
      title: z.string().default('Background music'),
      /** 0–1. Kept low by default: atmosphere, not a soundtrack. */
      volume: z.number().min(0).max(1).default(0.25),
      /** Start softly on the visitor's first tap/click/keypress, unless they paused it before. */
      autoStart: z.boolean().default(true),
    })
    .optional(),
  /** Who to contact about a security problem (published in /.well-known/security.txt). */
  securityContact: z.email(),
  /** Block AI training crawlers in robots.txt. Search engines are still allowed. */
  blockAiTrainingCrawlers: z.boolean().default(true),
});

export type Site = z.infer<typeof siteSchema>;

// ─────────────────────────────────────────────────────────────────────────────────────
// SIA MASSAGE. Every value marked MOCK is a placeholder until the real business details
// arrive (search this file for "MOCK"). The phone number is from the ACMA range reserved
// for fiction and the ABN is the ATO's published example, so neither belongs to anyone.
// ─────────────────────────────────────────────────────────────────────────────────────
export const site: Site = siteSchema.parse({
  name: 'Sia Massage',
  tagline: 'Find your stillness',
  description:
    'Traditional Asian massage in a calm, quiet space. Relaxation, remedial and reflexology treatments to restore body and mind.',
  url: 'https://www.siamassage.com.au', // MOCK: confirm the real domain
  business: {
    legalName: 'Sia Massage', // MOCK: registered business or company name
    abn: '51 824 753 556', // MOCK: ATO example ABN
    phone: '0491 570 156', // MOCK: ACMA fictional number
    email: 'hello@siamassage.com.au', // MOCK
    address: {
      street: 'Shop 2, 88 Example Road', // MOCK
      suburb: 'Strathpine', // MOCK
      state: 'QLD',
      postcode: '4500', // MOCK
    },
    hours: 'Open 7 days · 9am – 9pm', // MOCK
  },
  // MOCK: placeholder profiles (no href) show as icons; a production build refuses them
  // until the real Facebook / Instagram / Google Business links are added.
  social: [{ platform: 'facebook' }, { platform: 'instagram' }, { platform: 'google' }],
  nav: [
    { label: 'Philosophy', href: '#philosophy' },
    { label: 'Treatments', href: '#treatments' },
    { label: 'Your visit', href: '#visit' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ],
  cta: { label: 'Book a treatment', href: '#contact' },
  footerMenus: [
    {
      title: 'Legal & Privacy',
      links: [
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms & Conditions', href: '/terms-conditions' },
        { label: 'Accessibility', href: '/accessibility' },
      ],
    },
    {
      title: 'Client Care',
      links: [
        { label: 'Cancellation Policy', href: '/cancellation-policy' },
        { label: 'Health & Safety', href: '/health-safety' },
        { label: 'Code of Conduct', href: '/code-of-conduct' },
      ],
    },
  ],
  // Pixabay Content License (free commercial use). Alternatives to audition: docs/CREDITS.md.
  audio: {
    src: '/audio/sia-rain-meditation.mp3',
    title: 'Sia ambient music',
    volume: 0.22,
  },
  securityContact: 'hello@siamassage.com.au', // MOCK
});

/** "0468865876" → "0468 865 876"; "+61730000000" → "+61 7 3000 0000". */
export function formatAuPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('61')) return `+61 ${d.slice(2, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
  if (d.startsWith('04')) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 6)} ${d.slice(6)}`;
}

/** Phone number as a tel: link target in international form. */
export function telHref(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return `tel:+61${d.startsWith('61') ? d.slice(2) : d.slice(1)}`;
}
