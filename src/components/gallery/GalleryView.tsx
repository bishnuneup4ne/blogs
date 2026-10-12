"use client";

import { Media, MasonryGrid } from "@once-ui-system/core";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfig } from "@/components/ConfigProvider";

export default function GalleryView() {
  const { gallery } = useConfig();

  if (!gallery.images?.length) {
    return (
      <EmptyState
        icon="sparkle"
        title="No images yet"
        description="Gallery images will show up here as soon as they are added."
      />
    );
  }

  return (
    <MasonryGrid columns={2} s={{ columns: 1 }}>
      {gallery.images.map((image, index) => (
        <Media
          enlarge
          priority={index < 10}
          sizes="(max-width: 560px) 100vw, 50vw"
          key={index}
          radius="m"
          aspectRatio={image.orientation === "horizontal" ? "16 / 9" : "3 / 4"}
          src={image.src}
          alt={image.alt}
        />
      ))}
    </MasonryGrid>
  );
}
