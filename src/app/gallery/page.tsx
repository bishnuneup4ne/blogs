import { Flex, Meta, Schema } from "@once-ui-system/core";
import GalleryView from "@/components/gallery/GalleryView";
import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";

export async function generateMetadata() {
  const config = await getSiteConfig();
  return Meta.generate({
    title: config.gallery.title,
    description: config.gallery.description,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(config.gallery.title)}`,
    path: config.gallery.path,
  });
}

export default async function Gallery() {
  const config = await getSiteConfig();
  const { gallery, person } = config;
  return (
    <Flex maxWidth="l">
      <Schema
        as="webPage"
        baseURL={baseURL}
        title={gallery.title}
        description={gallery.description}
        path={gallery.path}
        image={`/api/og/generate?title=${encodeURIComponent(gallery.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${gallery.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <GalleryView />
    </Flex>
  );
}
