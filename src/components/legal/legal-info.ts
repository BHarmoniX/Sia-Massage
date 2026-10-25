// Values shared by the legal pages, worked out once from src/config/site.ts.
import { formatAuPhone, site, telHref, type Site } from '../../config/site';

const STATE_NAMES = {
  QLD: 'Queensland',
  NSW: 'New South Wales',
  VIC: 'Victoria',
  TAS: 'Tasmania',
  SA: 'South Australia',
  WA: 'Western Australia',
  NT: 'the Northern Territory',
  ACT: 'the Australian Capital Territory',
} as const;

const { business } = site;
// Safe defaults so the footer's link check can load this even on a site with no legal pages.
const legal: NonNullable<Site['legal']> = site.legal ?? {
  updated: '1970-01-01',
  reviewed: false,
  serviceNoun: 'appointment',
  practitioner: 'staff member',
  collectsHealthInfo: false,
  giftVouchers: false,
  healthSafety: false,
  attribution: [],
  ai: { builtWithAI: true, aiImagery: false, aiChat: false, customerDataInAI: false },
};

export const info = {
  name: site.name,
  legalName: business.legalName,
  abn: business.abn,
  email: business.email,
  privacyEmail: legal.privacyContact ?? business.email,
  phone: business.phone ? formatAuPhone(business.phone) : undefined,
  phoneHref: business.phone ? telHref(business.phone) : undefined,
  address: business.address
    ? `${business.address.street}, ${business.address.suburb} ${business.address.state} ${business.address.postcode}`
    : undefined,
  /** Governing law, from the business's state (Queensland if no address is set). */
  stateName: STATE_NAMES[business.address?.state ?? 'QLD'],
  service: legal.serviceNoun,
  services: `${legal.serviceNoun}s`,
  practitioner: legal.practitioner,
  practitioners: `${legal.practitioner}s`,
  legal,
  /** Whether robots.txt asks AI training crawlers to stay away. */
  blocksAiCrawlers: site.blockAiTrainingCrawlers,
};

/** The pages a site builds: the first three always, Client Care only when configured. */
export function legalPages() {
  if (!site.legal) return [];
  return [
    { slug: 'privacy-policy', on: true },
    { slug: 'terms-conditions', on: true },
    { slug: 'accessibility', on: true },
    { slug: 'cancellation-policy', on: Boolean(legal.cancellation) },
    { slug: 'health-safety', on: legal.healthSafety },
    { slug: 'code-of-conduct', on: Boolean(legal.codeOfConduct) },
  ]
    .filter((p) => p.on)
    .map((p) => p.slug);
}
