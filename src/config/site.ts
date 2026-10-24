// The one file to fill in per client. Everything client-specific — name, contact details,
// links, legal pages — is read from here, so a value is never hard-coded twice.
// It is validated at build time: a malformed phone, email or URL stops the build.

import { z } from 'zod';

const auPhone = z
  .string()
  .regex(/^(\+61|0)[2-478]( ?\d){8}$/, 'Use an Australian number, e.g. 0468 865 876 or +61 7 3000 0000');

const abn = z
  .string()
  .regex(/^\d{2} ?\d{3} ?\d{3} ?\d{3}$/, 'ABN is 11 digits, e.g. 12 345 678 901')
  .optional();

const link = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

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
  }),
  social: z.array(link.extend({ href: z.url({ protocol: /^https$/ }) })).default([]),
  nav: z.array(link).default([]),
  legal: z.array(link).default([]),
  /** Who to contact about a security problem (published in /.well-known/security.txt). */
  securityContact: z.email(),
  /** Block AI training crawlers in robots.txt. Search engines are still allowed. */
  blockAiTrainingCrawlers: z.boolean().default(true),
});

export type Site = z.infer<typeof siteSchema>;

export const site: Site = siteSchema.parse({
  name: 'Illuminara Core',
  tagline: 'Secure, immersive websites',
  description: 'A secure, fast, production-ready website base by Illuminara Creative Studio.',
  url: 'https://example.com.au',
  business: {
    legalName: 'Illuminara Creative Studio',
    email: 'hello@example.com.au',
  },
  nav: [{ label: 'Home', href: '/' }],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms & Conditions', href: '/terms-conditions' },
    { label: 'Accessibility', href: '/accessibility' },
  ],
  securityContact: 'security@example.com.au',
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
