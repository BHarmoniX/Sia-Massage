import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatAuPhone, isValidAbn, siteSchema, telHref } from '../src/config/site.ts';

const minimal = {
  name: 'Test',
  description: 'Test site',
  url: 'https://example.com.au',
  business: { legalName: 'Test Pty Ltd' },
  securityContact: 'security@example.com.au',
};

describe('client settings validation', () => {
  it('accepts real ABNs and rejects typos', () => {
    assert.equal(isValidAbn('51 824 753 556'), true);
    assert.equal(isValidAbn('51 824 753 557'), false);
    assert.equal(isValidAbn('12 345 678 901'), false);
  });

  it('refuses javascript: and data: links in menus', () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,hi', 'JaVaScRiPt:alert(1)']) {
      const result = siteSchema.safeParse({ ...minimal, nav: [{ label: 'x', href }] });
      assert.equal(result.success, false, href);
    }
  });

  it('refuses non-https site and social URLs', () => {
    assert.equal(siteSchema.safeParse({ ...minimal, url: 'http://example.com.au' }).success, false);
    const social = [{ platform: 'facebook', href: 'http://facebook.com/x' }];
    assert.equal(siteSchema.safeParse({ ...minimal, social }).success, false);
  });

  it('refuses a non-Australian phone number', () => {
    const result = siteSchema.safeParse({ ...minimal, business: { ...minimal.business, phone: '555-0100' } });
    assert.equal(result.success, false);
  });

  it('formats Australian phone numbers for display and dialling', () => {
    assert.equal(formatAuPhone('0491570006'), '0491 570 006');
    assert.equal(telHref('0491 570 006'), 'tel:+61491570006');
  });
});
