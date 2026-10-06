import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token?.trim() || process.env.GITHUB_TOKEN?.trim();

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No GitHub token provided and no GITHUB_TOKEN set in environment.',
      }, { status: 400 });
    }

    // 1. Fetch authenticated user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ApexSEO-Engine',
      },
      cache: 'no-store',
    });

    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({ message: userRes.statusText }));
      return NextResponse.json({
        success: false,
        error: `Invalid GitHub Token (${userRes.status}): ${err.message || 'Unauthorized'}`,
      }, { status: 401 });
    }

    const userData = await userRes.json();

    // 2. Fetch accessible repos for this token
    const reposRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ApexSEO-Engine',
      },
      cache: 'no-store',
    });

    let repos = [];
    if (reposRes.ok) {
      const reposData = await reposRes.json();
      repos = reposData.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        defaultBranch: r.default_branch || 'main',
        isPrivate: r.private,
        url: r.html_url,
      }));
    }

    return NextResponse.json({
      success: true,
      user: {
        login: userData.login,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
      },
      repos,
      usingEnvToken: !body.token && Boolean(process.env.GITHUB_TOKEN),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    hasEnvToken: Boolean(process.env.GITHUB_TOKEN),
  });
}

