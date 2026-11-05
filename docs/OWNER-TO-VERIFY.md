# Sia Massage: details and claims for the owner to verify

Everything below is on the site now as a **placeholder or a draft claim**. Nothing here has been
changed. Once the owner confirms or corrects an item, update it (most live in
`src/config/site.ts`, marked `MOCK`, or in `src/pages/index.astro`) and tick it off.

Last updated: 2026-11-04

---

## 1. Business details (all placeholders)

| What | Shown now | Where it lives |
|---|---|---|
| Domain | www.siamassage.com.au | `site.ts` → `url` |
| Registered business name | Sia Massage | `site.ts` → `business.legalName` |
| ABN | 51 824 753 556 (example ABN) | `site.ts` → `business.abn` |
| Phone | 0491 570 156 (fictional number range) | `site.ts` → `business.phone` |
| Email | hello@siamassage.com.au | `site.ts` → `business.email`, `securityContact` |
| Address | Shop 2, 88 Example Road, Strathpine QLD 4500 | `site.ts` → `business.address` (also drives the Google Maps link) |
| Opening hours | Open 7 days · 9am – 9pm | `site.ts` → `business.hours` (hero, contact card, footer) |
| Facebook / Instagram / Google Business | Icons only, no links yet | `site.ts` → `social` |

## 2. Treatments, times and prices

All six treatments, their durations and prices are placeholders (`index.astro` → `treatments`):

| Treatment | Shown now |
|---|---|
| A Quiet Pause 片刻 | 30 min · $55 |
| Classic Relaxation 放松 | 60 min · $90 |
| Deep Relaxation 静养 | 90 min · $130 |
| The Sia Ritual 仪式 | 120 min · $170 |
| Together 同享 (couples) | 60 min · $180 / 90 min · $260 |
| Gift of Calm 礼物 (gift voucher) | From $55 |

Also to confirm:
- [ ] The treatment names and their one-line descriptions
- [ ] That Sia offers couples treatments and gift vouchers at all
- [ ] "Prices in AUD, GST inclusive" (depends on whether the business is registered for GST)

## 3. Booking

- [ ] **No booking system is linked yet.** Every "Book" button currently jumps to the
      Treatments or Contact section. The owner's booking link (and whether it can open on a
      chosen treatment) is needed.

## 4. Claims in the page copy

| Claim | Where |
|---|---|
| "As a Chinese-owned business with a predominantly Chinese team…" | Philosophy → Our story |
| "Rooted in Chinese tradition." | Philosophy → Our story heading |
| "Chinese relaxation massage" (identity; also the search description) | Search description |
| "Treat yourself to a moment of total relaxation. Rediscover your wellness through the art of traditional Chinese massage." (new 2026-11-05; "traditional Chinese massage" vs "Chinese relaxation massage" used elsewhere) | Hero paragraph |
| "A quieter kind of care." (now both the hero tagline and the Philosophy heading) | Hero, Philosophy |
| "Your therapist will discuss your preferences and the pressure that feels right for you." | Your visit → Breathe |
| "attentive hands and considered techniques" | Your visit → Release |

## 5. FAQ answers (all drafts)

Each answer describes how Sia works and must be confirmed:

- [ ] **Booking ahead:** "Walk-ins are welcome whenever a therapist is free." (Does Sia take walk-ins?)
- [ ] **What to wear:** "You undress only to your comfort, and stay covered with fresh towels throughout."
- [ ] **Arriving early:** "Five to ten minutes before your time is ideal."
- [ ] **Pressure:** "Your therapist will ask about your preferences before you begin…"
- [ ] **Choosing a treatment:** "get in touch and we'll happily help you…"
- [ ] **Before your massage:** asks guests to mention injuries, health conditions and pregnancy.
- [ ] **Cancellation:** built from the policy settings in section 6.

## 6. Policies (legal pages: drafts)

The six legal pages (Privacy, Terms, Accessibility, Cancellation, Health & Safety, Code of
Conduct) use these placeholder choices (`site.ts` → `legal`):

| Policy | Shown now |
|---|---|
| Cancellation notice | 24 hours |
| Late cancellation fee | 50% of the treatment price |
| No-show fee | The full treatment price |
| Late-arrival grace period | 10 minutes |
| Minimum age | 18 |

- [ ] Owner confirms each policy; the wording is reviewed; then set `legal.reviewed: true`
      (a production build refuses to publish until this is done).
- [x] **AI disclosure (done 2026-11-04):** the Terms page now says some photographs, including
      scenes with people, are AI-generated to illustrate the experience and are not Sia's staff,
      guests or premises, and the credits list them as AI-generated. **When real photos replace
      the AI ones**, update the credits (`site.ts` → `legal.attribution`); once none are left,
      set `ai.aiPhotographs` (and `aiImagery`) back to `false`.

## 7. Photos that are AI-generated or placeholders

These are not photos of Sia. Real photos are preferred wherever the owner can supply them:

| Photo | Where | Note |
|---|---|---|
| `team-sia.jpg` | Our story | **AI placeholder team, not Sia's staff.** Replace with a real team photo before launch. |
| `spa-room.jpg` | Through the doorway (Your visit) | AI-generated treatment room and people |
| `treat-*.jpg` (six) | Treatments | AI-generated treatment photos |
| `tradition-hands.jpg` | The tradition card | AI-generated |
| `faq-room.jpg`, `morning-room.jpg` | FAQ, The place | AI-generated |
| `shop-front.jpg` | The experience card | Placeholder for a real photo of the studio |

## 8. Chinese text (meaning to confirm with the owner)

- [ ] Doorway couplet: 身体放松 · 心自宁静 ("a relaxed body creates a calm mind")
- [ ] 入 above the doorway ("enter")
- [ ] 静息 on the hero moon ("quiet rest"), 静心 on the philosophy card
- [ ] 约 on the contact card seal ("appointment")
- [ ] The six treatment characters in section 2

---

## Launch-day technical tasks (for us, not the owner)

- [ ] Remove the temporary `?capture` screenshot mode, the `?perf` timing test and the `?tour`
      walkthrough mode (`src/client/TourMode.astro` and its `<TourMode />` line in `index.astro`)
- [ ] Production build (`SITE_ENV=production`) so search engines can index the site
- [ ] Connect the real domain and hosting (Hostinger)
- [ ] Google Analytics: to set up together another day (needs a privacy-policy update and a
      cookie-consent choice)
