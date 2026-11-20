import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateOrReservedIp, validateSafePublicUrl } from '../src/lib/acquisition/ssrf';
import { calculateDeterministicOpportunityScore } from '../src/lib/acquisition/scoring';
import { normalizeBusinessName, normalizeDomain } from '../src/lib/acquisition/discovery';
import { classifyProspectReply } from '../src/lib/acquisition/salesAgent';

describe('SSRF & Website Crawling Security', () => {
  it('blocks loopback, RFC1918 private networks, and cloud metadata IPs', () => {
    assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('10.0.0.5'), true);
    assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
    assert.equal(isPrivateOrReservedIp('192.168.1.10'), true);
    assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);
    assert.equal(isPrivateOrReservedIp('::1'), true);
    assert.equal(isPrivateOrReservedIp('::ffff:127.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('fc00::1'), true);
    assert.equal(isPrivateOrReservedIp('fe80::1'), true);
  });

  it('allows public routable IPs', () => {
    assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
    assert.equal(isPrivateOrReservedIp('1.1.1.1'), false);
    assert.equal(isPrivateOrReservedIp('93.184.216.34'), false);
  });

  it('rejects non-HTTP protocols, localhost, and internal metadata hostnames', async () => {
    const fileRes = await validateSafePublicUrl('file:///etc/passwd');
    assert.equal(fileRes.safe, false);

    const localRes = await validateSafePublicUrl('http://localhost:3000/api/leads');
    assert.equal(localRes.safe, false);

    const metaRes = await validateSafePublicUrl('http://169.254.169.254/latest/meta-data/');
    assert.equal(metaRes.safe, false);

    const gcpMeta = await validateSafePublicUrl('http://metadata.google.internal/computeMetadata/v1/');
    assert.equal(gcpMeta.safe, false);
  });
});

describe('Deterministic Opportunity Scoring (v1.0)', () => {
  it('scores a verified high-LTV local business with clear SEO gaps as Priority A (80-100)', () => {
    const res = calculateDeterministicOpportunityScore({
      businessName: 'SmileCare Dental Clinic',
      websiteUrl: 'https://smilecare-london.example',
      websiteStatus: 'VERIFIED',
      industry: 'Dental clinics',
      country: 'United Kingdom',
      city: 'London',
      address: '10 Harley St, London',
      publicEmail: 'info@smilecare-london.example',
      publicPhone: '+44 20 7946 0000',
      seoScore: 48,
      auditIssues: [
        { category: 'On-Page SEO', severity: 'CRITICAL', title: 'Missing Meta Description' },
        { category: 'Structured Data', severity: 'HIGH', title: 'No Schema.org Structured Data Found' },
      ],
      rawEvidence: {
        isHttps: true,
        hasViewport: true,
        wordCount: 420,
        schemaTypes: [],
      },
    });

    assert.equal(res.version, 'v1.0');
    assert.equal(res.priority, 'A');
    assert.ok(res.totalScore >= 80 && res.totalScore <= 100);
    assert.ok(res.reasons.length > 0);
    assert.ok(res.recommendedServices.length > 0);
  });

  it('produces identical reproducible scores on repeated calls', () => {
    const input = {
      businessName: 'Alpha Bakery',
      websiteUrl: null,
      websiteStatus: 'UNVERIFIED',
      industry: 'Bakery',
      country: 'France',
      city: 'Paris',
      address: null,
      publicEmail: null,
      publicPhone: null,
      seoScore: null,
    };
    const r1 = calculateDeterministicOpportunityScore(input);
    const r2 = calculateDeterministicOpportunityScore(input);
    assert.deepEqual(r1, r2);
    assert.ok(r1.missingInfo.length > 0);
  });
});

describe('Business Normalization & Deduplication', () => {
  it('normalizes legal suffixes and domains consistently', () => {
    assert.equal(normalizeBusinessName('Acme Dental Ltd.'), 'acme dental');
    assert.equal(normalizeBusinessName('ACME Dental LLC'), 'acme dental');
    assert.equal(normalizeDomain('https://www.ExampleClinic.co.uk/contact'), 'exampleclinic.co.uk');
  });
});

describe('Outreach Compliance & Reply Classification', () => {
  it('immediately suppresses leads that reply with unsubscribe or opt-out', async () => {
    const res = await classifyProspectReply('Please unsubscribe me and remove my email from your list.');
    assert.equal(res.classification, 'UNSUBSCRIBE');
    assert.equal(res.shouldSuppress, true);
    assert.equal(res.suggestedNextStatus, 'UNSUBSCRIBED');
  });

  it('detects pricing requests as INTERESTED', async () => {
    const res = await classifyProspectReply('Thanks! How much does your SEO package cost? Please send pricing.');
    assert.equal(res.classification, 'REQUESTING_PRICING');
    assert.equal(res.shouldSuppress, false);
    assert.equal(res.suggestedNextStatus, 'INTERESTED');
  });
});
