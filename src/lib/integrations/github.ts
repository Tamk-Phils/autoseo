/**
 * GitHub Integration Client (Section 28 of text.txt)
 * Generates automated branches, patches, and Pull Requests for SEO fixes.
 */

export interface GitHubConfig {
  token: string;
  repo: string; // "owner/repo" e.g. "myorg/website"
  defaultBranch?: string;
}

export async function testGitHubConnection(config: GitHubConfig): Promise<{
  success: boolean;
  repoName?: string;
  defaultBranch?: string;
  permissions?: { push: boolean; pull: boolean };
  error?: string;
}> {
  try {
    const cleanRepo = config.repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '');
    const res = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ApexSEO-Engine',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return {
        success: false,
        error: `GitHub repository connection failed (${res.status}): ${err.message || 'Unauthorized or repository not found'}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      repoName: data.full_name,
      defaultBranch: data.default_branch || 'main',
      permissions: {
        push: Boolean(data.permissions?.push),
        pull: Boolean(data.permissions?.pull),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to GitHub: ${err.message}`,
    };
  }
}

export async function createGitHubSEOChangePR(
  config: GitHubConfig,
  params: {
    affectedUrl: string;
    changeType: string;
    newValue: string;
    originalValue?: string | null;
    reason: string;
  }
): Promise<{
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  branch?: string;
  error?: string;
}> {
  try {
    const cleanRepo = config.repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '');
    const headers = {
      Authorization: `Bearer ${config.token.trim()}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'ApexSEO-Engine',
    };

    // 1. Get repository default branch if not specified
    let baseBranch = config.defaultBranch;
    if (!baseBranch) {
      const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers });
      if (!repoRes.ok) throw new Error('Failed to retrieve repository information.');
      const repoData = await repoRes.json();
      baseBranch = repoData.default_branch || 'main';
    }

    // 2. Get latest commit SHA on base branch
    const refRes = await fetch(`https://api.github.com/repos/${cleanRepo}/git/ref/heads/${baseBranch}`, { headers });
    if (!refRes.ok) throw new Error(`Could not locate branch "heads/${baseBranch}".`);
    const refData = await refRes.json();
    const baseCommitSha = refData.object.sha;

    // 3. Create a unique fix branch
    const branchName = `seo-fix-${Date.now()}`;
    const createBranchRes = await fetch(`https://api.github.com/repos/${cleanRepo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseCommitSha,
      }),
    });

    if (!createBranchRes.ok) {
      const err = await createBranchRes.json();
      throw new Error(`Failed to create branch "${branchName}": ${err.message}`);
    }

    // 4. Update or create the SEO configuration patch file: `seo.config.json`
    const filePath = 'seo.config.json';
    let existingFileSha: string | undefined;
    let existingContent: any = { generatedBy: 'ApexSEO Autonomous Engine', overrides: {} };

    const fileRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${filePath}?ref=${branchName}`, {
      headers,
    });

    if (fileRes.ok) {
      const fileData = await fileRes.json();
      existingFileSha = fileData.sha;
      try {
        const decoded = Buffer.from(fileData.content, 'base64').toString('utf8');
        existingContent = JSON.parse(decoded);
      } catch {
        // Fallback default
      }
    }

    // Update overrides for the affected URL
    let pathKey = '/';
    try {
      const u = new URL(params.affectedUrl);
      pathKey = u.pathname;
    } catch {
      pathKey = params.affectedUrl;
    }

    if (!existingContent.overrides) existingContent.overrides = {};
    if (!existingContent.overrides[pathKey]) existingContent.overrides[pathKey] = {};

    if (params.changeType.toUpperCase().includes('TITLE')) {
      existingContent.overrides[pathKey].title = params.newValue;
    } else if (params.changeType.toUpperCase().includes('DESCRIPTION')) {
      existingContent.overrides[pathKey].description = params.newValue;
    } else if (params.changeType.toUpperCase().includes('SCHEMA')) {
      existingContent.overrides[pathKey].schemaJson = params.newValue;
    } else {
      existingContent.overrides[pathKey][params.changeType] = params.newValue;
    }
    existingContent.lastUpdated = new Date().toISOString();

    const updatedBase64 = Buffer.from(JSON.stringify(existingContent, null, 2)).toString('base64');

    // Commit file to the new branch
    const commitRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${filePath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `chore(seo): optimize ${params.changeType} for ${pathKey}`,
        content: updatedBase64,
        branch: branchName,
        sha: existingFileSha,
      }),
    });

    if (!commitRes.ok) {
      const err = await commitRes.json();
      throw new Error(`Failed to commit SEO patch: ${err.message}`);
    }

    // 5. Create Pull Request
    const prBody = `### 🚀 ApexSEO Autonomous Optimization PR

**Affected Target:** \`${params.affectedUrl}\`  
**Change Category:** \`${params.changeType}\`  
**Reason:** ${params.reason}

---

### 📝 Change Details
| Property | Value |
| :--- | :--- |
| **Original Value** | ${params.originalValue ? `\`${params.originalValue}\`` : '*Missing or unoptimized*'} |
| **Optimized Value** | \`${params.newValue}\` |
| **Status** | Automated Pull Request generated by ApexSEO Engine |

> 🛡️ **Safety Guardrail**: Review the metadata changes above and merge when ready. You can close or revert this branch at any time.
`;

    const prRes = await fetch(`https://api.github.com/repos/${cleanRepo}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `SEO: Optimize ${params.changeType} for ${pathKey}`,
        head: branchName,
        base: baseBranch,
        body: prBody,
      }),
    });

    if (!prRes.ok) {
      const err = await prRes.json();
      throw new Error(`Failed to create Pull Request: ${err.message}`);
    }

    const prData = await prRes.json();
    return {
      success: true,
      prUrl: prData.html_url,
      prNumber: prData.number,
      branch: branchName,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `GitHub PR generation failed: ${err.message}`,
    };
  }
}

