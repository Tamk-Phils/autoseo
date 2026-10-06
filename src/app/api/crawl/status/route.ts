import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { globalActiveCrawlLogs } from '../start/route';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      // Return latest job
      const latestJob = await prisma.crawlJob.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { project: true },
      });

      if (!latestJob) {
        return NextResponse.json({ success: false, message: 'No active or past crawls found' });
      }

      const activeLogs = globalActiveCrawlLogs[latestJob.id] || [];
      const storedLogs = latestJob.logs ? JSON.parse(latestJob.logs) : [];
      const logs = activeLogs.length > 0 ? activeLogs : storedLogs;

      return NextResponse.json({
        success: true,
        job: latestJob,
        logs,
      });
    }

    const job = await prisma.crawlJob.findUnique({
      where: { id: jobId },
      include: { project: true },
    });

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    const activeLogs = globalActiveCrawlLogs[job.id] || [];
    const storedLogs = job.logs ? JSON.parse(job.logs) : [];
    const logs = activeLogs.length > 0 ? activeLogs : storedLogs;

    return NextResponse.json({
      success: true,
      job,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

