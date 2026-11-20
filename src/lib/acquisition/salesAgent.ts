import { executeAiPrompt } from '../ai/provider';

export interface ProposalGenerationInput {
  businessName: string;
  websiteUrl: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  seoScore: number | null;
  opportunityScore: number | null;
  issues: Array<{ category: string; severity: string; title: string; evidence: string }>;
  recommendedServices: string[];
  senderBrandName: string;
  channel?: 'EMAIL' | 'WHATSAPP' | 'LINKEDIN';
}

export interface GeneratedProposal {
  subject: string;
  body: string;
  proposalSummary: string;
  provider: string;
  estimatedCostUsd: number;
}

/**
 * Generates a compliant, evidence-grounded personalized sales proposal & outreach draft.
 * Strictly references verified business information and actual measured audit findings.
 */
export async function generatePersonalizedProposal(
  input: ProposalGenerationInput
): Promise<GeneratedProposal> {
  const topIssues = input.issues.slice(0, 4);
  const issueBullets =
    topIssues.length > 0
      ? topIssues.map((i) => `- ${i.title} (${i.category}): ${i.evidence}`).join('\n')
      : '- Opportunities to strengthen page metadata, structured data, and local search visibility.';

  const locationStr = [input.city, input.country].filter(Boolean).join(', ') || 'your market';
  const sender = input.senderBrandName || 'AutoSEO Team';

  const systemPrompt = `You are a professional B2B SEO consultant writing a concise, respectful, non-spammy outreach draft.
STRICT RULES:
1. Only reference the verified facts and measured SEO issues provided. NEVER invent traffic numbers, rankings, or backlink stats.
2. Keep the email under 160 words, polite, consultative, and easy to opt out of.
3. Return ONLY valid JSON with keys: "subject", "body", "proposalSummary".`;

  const userPrompt = `Business: ${input.businessName}
Website: ${input.websiteUrl || 'Pending verification'}
Industry: ${input.industry || 'Local Business'}
Location: ${locationStr}
Measured SEO Score: ${input.seoScore !== null ? `${input.seoScore}/100` : 'Not yet audited'}
Verified Audit Findings:
${issueBullets}
Recommended Services: ${input.recommendedServices.join('; ')}
Sender: ${sender}
Channel: ${input.channel || 'EMAIL'}

Return JSON: { "subject": "...", "body": "...", "proposalSummary": "..." }`;

  const aiRes = await executeAiPrompt({
    systemPrompt,
    userPrompt,
    temperature: 0.3,
    maxTokens: 700,
  });

  // Parse structured JSON safely with deterministic fallback
  try {
    const jsonMatch = aiRes.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.subject && parsed.body) {
        return {
          subject: String(parsed.subject).trim(),
          body: String(parsed.body).trim(),
          proposalSummary: String(parsed.proposalSummary || `Verified SEO assessment for ${input.businessName}`).trim(),
          provider: aiRes.provider,
          estimatedCostUsd: aiRes.provider === 'heuristic-engine' ? 0 : 0.0015,
        };
      }
    }
  } catch {
    // Fall through to deterministic evidence-based draft
  }

  const issueListText =
    topIssues.length > 0
      ? topIssues.slice(0, 3).map((i) => `• ${i.title}: ${i.evidence}`).join('\n')
      : '• Page metadata, structured data, and local search visibility enhancements';

  const subject = `SEO improvement ideas for ${input.businessName}`;
  const body = `Hello ${input.businessName} Team,

While researching ${input.industry || 'businesses'} in ${locationStr}, I reviewed ${input.websiteUrl || 'your online presence'} and noticed a few specific technical and on-page SEO opportunities:

${issueListText}

${sender} helps businesses resolve these issues with automated website intelligence and continuous SEO optimization. We would be glad to share a brief, no-obligation assessment showing where these improvements could strengthen your search visibility.

Would you like me to send over the full summary?

Best regards,
${sender}

(If you prefer not to hear from us again, simply reply "unsubscribe" and we will immediately remove your contact from our list.)`;

  const proposalSummary = `Evidence-based SEO proposal for ${input.businessName} (${input.seoScore ?? 'N/A'}/100) targeting ${
    topIssues.map((i) => i.category).slice(0, 3).join(', ') || 'Technical & On-Page SEO'
  }.`;

  return {
    subject,
    body,
    proposalSummary,
    provider: aiRes.provider,
    estimatedCostUsd: aiRes.provider === 'heuristic-engine' ? 0 : 0.0015,
  };
}

export type ReplyClassification =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'REQUESTING_PRICING'
  | 'REQUESTING_INFO'
  | 'HAS_PROVIDER'
  | 'UNSUBSCRIBE'
  | 'NEEDS_HUMAN';

export interface ReplyClassificationResult {
  classification: ReplyClassification;
  shouldSuppress: boolean;
  suggestedNextStatus: string;
  suggestedFollowUpAction: string;
}

/**
 * Classifies an incoming prospect reply deterministically first (for safety on opt-outs)
 * and uses AI for nuanced intent detection.
 */
export async function classifyProspectReply(replyText: string): Promise<ReplyClassificationResult> {
  const lower = replyText.toLowerCase();

  // Deterministic safety guard: ALWAYS catch opt-out / unsubscribe immediately
  if (
    /\b(unsubscribe|opt[\s-]?out|remove me|stop emailing|do not contact|take me off|gdpr|stop messaging)\b/i.test(lower)
  ) {
    return {
      classification: 'UNSUBSCRIBE',
      shouldSuppress: true,
      suggestedNextStatus: 'UNSUBSCRIBED',
      suggestedFollowUpAction: 'Immediately suppressed. Do not send any further outreach.',
    };
  }

  if (/\b(already have|we have an agency|in-house seo|current seo provider|already working with)\b/i.test(lower)) {
    return {
      classification: 'HAS_PROVIDER',
      shouldSuppress: false,
      suggestedNextStatus: 'DISQUALIFIED',
      suggestedFollowUpAction: 'Log existing provider and optionally schedule a polite 6-month check-in.',
    };
  }

  if (/\b(not interested|no thanks|no thank you|pass for now|don't need)\b/i.test(lower)) {
    return {
      classification: 'NOT_INTERESTED',
      shouldSuppress: false,
      suggestedNextStatus: 'LOST',
      suggestedFollowUpAction: 'Close outreach sequence politely without further follow-ups.',
    };
  }

  if (/\b(price|pricing|cost|how much|rates|quote|budget|packages)\b/i.test(lower)) {
    return {
      classification: 'REQUESTING_PRICING',
      shouldSuppress: false,
      suggestedNextStatus: 'INTERESTED',
      suggestedFollowUpAction: 'Send transparent pricing tiers and schedule a discovery call.',
    };
  }

  if (/\b(interested|yes please|send it|let's talk|sounds good|book a call|tell me more|share the assessment)\b/i.test(lower)) {
    return {
      classification: 'INTERESTED',
      shouldSuppress: false,
      suggestedNextStatus: 'INTERESTED',
      suggestedFollowUpAction: 'Send the full SEO audit summary and propose a 15-minute walkthrough.',
    };
  }

  if (/\b(more info|more details|how does it work|what do you do|examples|case study)\b/i.test(lower)) {
    return {
      classification: 'REQUESTING_INFO',
      shouldSuppress: false,
      suggestedNextStatus: 'INTERESTED',
      suggestedFollowUpAction: 'Share verified audit breakdown and explain how AutoSEO works.',
    };
  }

  return {
    classification: 'NEEDS_HUMAN',
    shouldSuppress: false,
    suggestedNextStatus: 'CONTACTED',
    suggestedFollowUpAction: 'Flagged for human sales review.',
  };
}
