import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ success: true, authenticated: Boolean(user), user });
  } catch (error: any) {
    return NextResponse.json({ success: false, authenticated: false, error: error.message }, { status: 500 });
  }
}

