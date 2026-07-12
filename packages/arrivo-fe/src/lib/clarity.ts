export function initializeClarity(projectId?: string) {
  if (!projectId || typeof window === 'undefined' || window.clarity) return;

  window.clarity = (...args: unknown[]) => {
    window.clarity!.q = window.clarity!.q || [];
    window.clarity!.q.push(args);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
}

declare global {
  interface Window {
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] };
  }
}
