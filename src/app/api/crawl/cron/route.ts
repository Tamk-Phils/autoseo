import { NextResponse } from 'next/server';
import { runAutonomousCrawlPulse } from '@/lib/crawler/autonomousScheduler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

async function handlePulse() {
  try {
    const result = await runAutonomousCrawlPulse();
    return NextResponse.json(
      {
        success: true,
        message: 'Autonomous 1-minute crawl pulse triggered successfully.',
        result,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function GET() {
  return handlePulse();
}

export async function POST() {
  return handlePulse();
}

