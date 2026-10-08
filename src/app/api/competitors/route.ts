import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUrlForSsrf } from '@/lib/ssrf';
import { safeFetch } from '@/lib/ssrf';
import { getCurrentUser } from '@/lib/auth';
import * as cheerio from 'cheerio';

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const project = projectId
      ? await prisma.project.findFirst({ where: { id: projectId, userId: currentUser.id } })
      : await prisma.project.findFirst({ where: { userId: currentUser.id }, orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: true, competitors: [], opportunities: [], project: null });
    }

    const competitors = await prisma.competitor.findMany({
      where: { projectId: project.id },
      include: { pages: true },
      orderBy: { createdAt: 'desc' },
    });

    const opportunities = await prisma.contentOpportunity.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, competitors, opportunities, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const body = await req.json();
    const { projectId, domain, name } = body;

    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
    }

    let cleanDomain = domain.trim();
    if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
      cleanDomain = new URL(cleanDomain).hostname;
    }

    const project = projectId
      ? await prisma.project.findFirst({ where: { id: projectId, userId: currentUser.id } })
      : await prisma.project.findFirst({ where: { userId: currentUser.id }, orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const competitor = await prisma.competitor.create({
      data: {
        projectId: project.id,
        domain: cleanDomain,
        name: name || cleanDomain,
        seoScore: 0,
        searchVisibility: 0,
        commonKeywords: 0,
      },
    });

    const competitorUrl = `https://${cleanDomain}`;
    const discoveredTerms = new Set<string>();
    const competitorPages: Array<{ url: string; title?: string; topic?: string }> = [];
    try {
      const response = await safeFetch(competitorUrl, {
        headers: { Accept: 'text/html', 'User-Agent': 'ApexSEO-CompetitorResearch/1.0' },
        redirect: 'follow',
      });
      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        const title = $('title').first().text().trim();
        const headings = $('h1, h2').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20);
        const links = $('a[href]').map((_, el) => $(el).attr('href')).get().filter(Boolean).slice(0, 30);
        competitorPages.push({ url: competitorUrl, title, topic: headings.join(' | ') });
        for (const value of [title, ...headings, ...links.map((link) => link!.replace(/https?:\/\/[^/]+/, '').replace(/[-_/]+/g, ' '))]) {
          const phrase = value?.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
          if (phrase && phrase.length >= 3) discoveredTerms.add(phrase.toLowerCase());
        }
      }
    } catch {
      // Competitor research is best effort and should not block saving the competitor.
    }

    if (competitorPages.length > 0) {
      await prisma.competitorPage.createMany({ data: competitorPages.map((page) => ({ competitorId: competitor.id, ...page })) });
    }

    const existingKeywords = await prisma.keyword.findMany({ where: { projectId: project.id }, select: { term: true } });
    const existingTerms = new Set(existingKeywords.map((keyword) => keyword.term.toLowerCase()));
    const competitorTerms = Array.from(discoveredTerms).filter((term) => !existingTerms.has(term)).slice(0, 100);
    if (competitorTerms.length > 0) {
      await prisma.keyword.createMany({
        data: competitorTerms.map((term) => ({
          projectId: project.id,
          term,
          source: 'COMPETITOR_CONTENT',
          searchIntent: 'Competitor topic',
          trend: 'STABLE',
          opportunityNote: `Competitor-derived topic from ${cleanDomain}. Verify demand and rankings with Search Console or an SEO data provider before prioritizing.`,
        })),
      });
    }

    return NextResponse.json({ success: true, competitor, discoveredKeywordCount: competitorTerms.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

