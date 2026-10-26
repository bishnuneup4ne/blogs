import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAlbums } from "@/lib/data";
import styles from "./gallery.module.scss";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photo collections from Kathmandu, the trail and the cities between.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    url: "/gallery",
    title: "Gallery",
    description: "Photo collections from Kathmandu, the trail and the cities between.",
    type: "website",
  },
};

export default async function GalleryPage() {
  const albums = await getAlbums();
  const totalPhotos = albums.reduce((n, a) => n + a.photos.length, 0);

  return (
    <div className={styles.body}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Gallery</span>
      </nav>
      <h1 className={styles.title}>Gallery</h1>
      <p className={styles.lede}>
        {albums.length} {albums.length === 1 ? "album" : "albums"}, {totalPhotos} {totalPhotos === 1 ? "frame" : "frames"}. Mostly the light I happen to be standing in.
      </p>

      {albums.length === 0 ? (
        <p className={styles.empty}>No albums published yet. <Link href="/blog">Read the blog in the meantime</Link>.</p>
      ) : null}

      <ul className={styles.albums}>
        {albums.map((album) => (
          <li key={album.slug} className={styles.album}>
            <div className={styles.albumText}>
              <span className={styles.year}>{album.year}</span>
              <h2 className={styles.albumTitle}>
                <Link href={`/gallery/${album.slug}`}>{album.title}</Link>
              </h2>
              <p className={styles.subtitle}>{album.subtitle || album.description}</p>
              <p className={styles.albumMeta}>{album.photos.length} {album.photos.length === 1 ? "photo" : "photos"}</p>
              <Link href={`/gallery/${album.slug}`} className={`${styles.cta} btn btn-outline`}>
                View album
              </Link>
            </div>

            <Link href={`/gallery/${album.slug}`} className={styles.coverLink} tabIndex={-1} aria-hidden="true">
              {album.cover ? (
                <Image src={album.cover} alt="" fill sizes="(max-width: 1100px) 100vw, 640px" className={styles.coverImg} />
              ) : null}
            </Link>

            <div className={styles.thumbs}>
              {album.photos.slice(0, 4).map((photo) => (
                <Link key={photo.id} href={`/gallery/${album.slug}`} className={styles.thumb}>
                  <Image src={photo.src} alt="" fill sizes="80px" className={styles.thumbImg} />
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
