"use client";

import { Media, MasonryGrid, Text, Column } from "@once-ui-system/core";
import { useConfig } from "@/components/ConfigProvider";

export default function GalleryView() {
  const { gallery } = useConfig();

  if (!gallery.images?.length) {
    return (
      <Column paddingY="xl" horizontal="center">
        <Text variant="body-default-l" onBackground="neutral-weak" align="center">
          No gallery images yet. Add them in Admin → Gallery.
        </Text>
      </Column>
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
