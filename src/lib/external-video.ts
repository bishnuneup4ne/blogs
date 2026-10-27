export interface ExternalVideo {
  kind: "youtube" | "vimeo";
  id: string;
  url: string;
  embedUrl: string;
  thumbnail: string;
}

/** Returns the video id for a YouTube watch/shorts/embed URL, or null. */
export function parseYouTube(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  const hosts = new Set(["youtube.com", "m.youtube.com", "youtube-nocookie.com"]);
  const isShort = host === "youtu.be";
  if (!hosts.has(host) && !isShort) return null;

  let id: string | null = null;
  if (isShort) {
    id = url.pathname.slice(1).split("/")[0] || null;
  } else {
    const v = url.searchParams.get("v");
    if (v) id = v;
    else {
      const m = url.pathname.match(/\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{6,20})/);
      if (m) id = m[1];
    }
  }
  return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
}

/** Returns the video id for a Vimeo URL, or null. */
export function parseVimeo(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
  const m = url.pathname.match(/(?:^\/|\/)(\d{6,14})(?:$|\/)/);
  return m ? m[1] : null;
}

export function detectExternalVideo(raw: string): ExternalVideo | null {
  const yt = parseYouTube(raw);
  if (yt) {
    return {
      kind: "youtube",
      id: yt,
      url: `https://www.youtube.com/watch?v=${yt}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
      thumbnail: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }
  const vm = parseVimeo(raw);
  if (vm) {
    return {
      kind: "vimeo",
      id: vm,
      url: `https://vimeo.com/${vm}`,
      embedUrl: `https://player.vimeo.com/video/${vm}`,
      thumbnail: "",
    };
  }
  return null;
}

export interface VideoSource {
  kind: "file" | "youtube" | "vimeo";
  /** Direct file, or the watch/embed page opened when the clip is clicked. */
  href: string;
  poster: string;
  /** Privacy-friendly player URL used to play the clip inline. */
  embedSrc?: string;
}

/** Classifies any clip a row item might point at: an uploaded file, a YouTube
    link, or a Vimeo link. Returns null for stills. */
export function classifyVideo(raw: string): VideoSource | null {
  const external = detectExternalVideo(raw);
  if (external) {
    const embedSrc =
      external.kind === "youtube"
        ? `https://www.youtube-nocookie.com/embed/${external.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
        : `https://player.vimeo.com/video/${external.id}?autoplay=1&title=0&byline=0`;
    return {
      kind: external.kind,
      href: external.url,
      poster: external.thumbnail || `https://vumbnail.com/${external.id}.jpg`,
      embedSrc,
    };
  }
  return /\.(mp4|webm)(\?|$)/i.test(raw) ? { kind: "file", href: raw, poster: "" } : null;
}
