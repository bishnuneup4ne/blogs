import styles from "./VideoEmbed.module.scss";

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      let id = u.searchParams.get("v");
      if (!id && u.hostname === "youtu.be") {
        id = u.pathname.replace(/^\//, "").split("/")[0];
      }
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

type VideoEmbedProps = {
  url: string;
  title?: string;
};

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const embed = getEmbedUrl(url);
  if (!embed) {
    return (
      <p className={styles.invalid}>
        Could not embed this URL. Use a YouTube or Vimeo link.
      </p>
    );
  }

  return (
    <div className={styles.wrap}>
      <iframe
        src={embed}
        title={title || "Video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={styles.iframe}
      />
    </div>
  );
}
