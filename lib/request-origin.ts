import { headers } from "next/headers";

/** Host the browser used (honors proxies). Null when headers are missing. */
export async function requestOrigin(): Promise<string | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Absolute URL when we know the host; otherwise the path (fine for in-app redirects). */
export async function absoluteUrl(path: string): Promise<string> {
  const origin = await requestOrigin();
  if (!origin) return path;
  return `${origin}${path}`;
}
