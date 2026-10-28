import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAlbums } from "@/lib/data";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { routes } from "@/lib/routes";
import styles from "./gallery.module.scss";

const description = "Photo collections from Kathmandu, the trail and the cities between.";

export const metadata: Metadata = {
  title: "Gallery",
  description,
  alternates: { canonical: routes.gallery },
  openGraph: { url: routes.gallery, title: "Gallery", description, type: "website" },
};

export default async function GalleryPage() {
  const albums = await getAlbums();
  const totalPhotos = albums.reduce((n, a) => n + a.photos.length, 0);

  return (
    <div className={styles.body}>
      <Breadcrumb items={[{ label: "Home", href: routes.home }, { label: "Gallery" }]} />
      <h1 className={styles.title}>Gallery</h1>
      <p className={styles.lede}>
        {albums.length} {albums.length === 1 ? "album" : "albums"}, {totalPhotos}{" "}
        {totalPhotos === 1 ? "frame" : "frames"}. Mostly the light I happen to be standing in.
      </p>

      {albums.length === 0 ? (
        <p className={styles.empty}>
          No albums published yet. <Link href={routes.blog}>Read the blog in the meantime</Link>.
        </p>
      ) : null}

      <ul className={styles.albums}>
        {albums.map((album, i) => (
          <li key={album.slug} className={styles.album}>
            <div className={styles.albumText}>
              <span className={styles.year}>{album.year}</span>
              <h2 className={styles.albumTitle}>
                <Link href={routes.album(album.slug)}>{album.title}</Link>
              </h2>
              <p className={styles.subtitle}>{album.subtitle || album.description}</p>
              <p className={styles.albumMeta}>
                {album.photos.length} {album.photos.length === 1 ? "photo" : "photos"}
              </p>
              <Link href={routes.album(album.slug)} className={styles.cta}>
                View album
              </Link>
            </div>

            <Link href={routes.album(album.slug)} className={styles.coverLink} tabIndex={-1} aria-hidden="true">
              {album.cover ? (
                <Image
                  src={album.cover}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1100px) 100vw, 640px"
                  className={styles.coverImg}
                />
              ) : null}
            </Link>

            <div className={styles.thumbs} aria-hidden="true">
              {album.photos.slice(0, 4).map((photo) => (
                <span key={photo.id} className={styles.thumb}>
                  <Image src={photo.src} alt="" fill sizes="80px" className={styles.thumbImg} />
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
