"use client";

// Client-side fetch wrapper for /api/admin/* endpoints.
// Redirects to the login page when the session is missing or expired.
export async function adminFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/admin/login?next=${next}`;
  }
  return res;
}

export async function adminJson<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  const res = await adminFetch(input, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (data?.message) message = data.message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}
