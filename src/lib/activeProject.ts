'use client';

export function getActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get('projectId');
  if (urlId) return urlId;

  // 2. Check localStorage
  const savedId = localStorage.getItem('activeProjectId');
  if (savedId) return savedId;

  // 3. Check cookies
  const match = document.cookie.match(/(?:^|; )activeProjectId=([^;]*)/);
  if (match && match[1]) return decodeURIComponent(match[1]);

  return null;
}

export function setActiveProjectId(id: string) {
  if (typeof window === 'undefined' || !id) return;

  try {
    const prev = localStorage.getItem('activeProjectId');
    localStorage.setItem('activeProjectId', id);
    document.cookie = `activeProjectId=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;

    // Persist to server cookies reliably for SSR
    try {
      fetch('/api/projects/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      }).catch(() => {});
    } catch {}

    if (prev !== id) {
      window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: id } }));
    }
  } catch (err) {
    console.error('Failed to set active project id:', err);
  }
}

export function resolveActiveProject(projects: any[]): any | null {
  if (!projects || projects.length === 0) return null;

  const currentId = getActiveProjectId();
  let matched = currentId ? projects.find((p) => p.id === currentId) : null;

  if (!matched) {
    matched = projects[0];
  }

  // Only update active project if different from current selection
  if (matched?.id && matched.id !== currentId) {
    setActiveProjectId(matched.id);
  }

  return matched;
}

