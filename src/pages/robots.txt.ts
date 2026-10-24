import type { APIRoute } from 'astro';
import { site } from '../config/site';

// Crawlers that collect pages to train AI models. Blocking them does not affect search
// rankings. Well-behaved bots obey this; the rest are handled by edge bot management.
const AI_TRAINING_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'meta-externalagent',
  'Diffbot',
  'omgili',
  'cohere-training-data-crawler',
];

export const GET: APIRoute = () => {
  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /api/', ''];
  if (site.blockAiTrainingCrawlers) {
    for (const bot of AI_TRAINING_CRAWLERS) lines.push(`User-agent: ${bot}`, 'Disallow: /', '');
  }
  lines.push(`Sitemap: ${new URL('sitemap-index.xml', site.url)}`);
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
