import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumGrid } from "@/components/gallery/AlbumGrid";
import { AlbumNav } from "@/components/gallery/NextAlbum";
import { getAlbum, getAlbums } from "@/lib/data";
import { sanitizeRichText } from "@/lib/sanitize-rich";
import styles from "./album.module.scss";

export async function generateStaticParams() {
  return (await getAlbums()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return {};
  return {
    title: album.title,
    description: album.description,
    alternates: { canonical: `/gallery/${album.slug}` },
    openGraph: {
      url: `/gallery/${album.slug}`,
      title: album.title,
      description: album.description,
      type: "website",
      images: album.cover ? [{ url: album.cover, alt: album.title }] : undefined,
    },
  };
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [albums, album] = await Promise.all([getAlbums(), getAlbum(slug)]);
  if (!album) notFound();
  const idx = albums.findIndex((a) => a.slug === album.slug);
  const prev = idx > 0 ? albums[idx - 1] : null;
  const next = idx >= 0 && idx < albums.length - 1 ? albums[idx + 1] : null;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>{album.title}</h1>
          <p className={styles.subtitle}>{album.subtitle}</p>
          {album.description ? <p className={styles.description} dangerouslySetInnerHTML={{ __html: sanitizeRichText(album.description) }} /> : null}
          <p className={styles.count}>
            {album.photos.length} {album.photos.length === 1 ? "photo" : "photos"} · click any frame to enlarge
          </p>
        </div>
      </div>

      <div className={styles.body}>
        <AlbumGrid photos={album.photos} count={album.photos.length} />
      </div>

      {prev || next ? (
        <div className={styles.navWrap}>
          <AlbumNav prev={prev} next={next} />
        </div>
      ) : null}
    </div>
  );
}

