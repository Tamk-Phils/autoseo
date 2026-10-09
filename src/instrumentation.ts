export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initAutonomousScheduler } = await import('@/lib/crawler/autonomousScheduler');
    initAutonomousScheduler();
  }
}
