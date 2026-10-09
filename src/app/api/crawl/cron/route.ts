import { NextResponse } from 'next/server';
import { runAutonomousCrawlPulse } from '@/lib/crawler/autonomousScheduler';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const result = await runAutonomousCrawlPulse();
    return NextResponse.json({
      success: true,
      message: 'Autonomous 1-minute crawl pulse triggered successfully.',
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = await runAutonomousCrawlPulse();
    return NextResponse.json({
      success: true,
      message: 'Autonomous 1-minute crawl pulse triggered successfully.',
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
