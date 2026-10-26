import type { Album, GalleryPhoto } from "@/lib/types";

function photos(
  prefix: string,
  items: Array<[w: number, h: number, caption: string, takenAt: string]>,
): GalleryPhoto[] {
  return items.map(([width, height, caption, takenAt], i) => ({
    id: `${prefix}-${i + 1}`,
    src: `/images/gallery/${prefix}-${i + 1}.jpg`,
    alt: caption,
    caption,
    width,
    height,
    takenAt,
    camera: "Fujifilm X-T4 · 23mm",
    kind: "image" as const,
  }));
}

export const albums: Album[] = [
  {
    slug: "kathmandu-in-gold",
    title: "Kathmandu in gold",
    subtitle: "A city that wakes up slowly",
    description:
      "Mandatory stops on the way home, photographed in the hour when the dust turns gold and nobody is rushing.",
    year: 2026,
    cover: "/images/gallery/ktm-1.jpg",
    photos: photos("ktm", [
      [1400, 786, "Boudhanath at golden hour", "2026-03-12"],
      [1400, 933, "The stupa below the Himalaya", "2026-03-12"],
      [1400, 1050, "Rooftops above the old town", "2026-03-13"],
      [1400, 933, "Prayer flags over the valley", "2026-03-13"],
      [1400, 2108, "A narrow alley in the old town", "2026-03-14"],
      [1400, 1786, "Mountain light over the valley", "2026-03-14"],
    ]),
  },
  {
    slug: "the-ridge",
    title: "The ridge",
    subtitle: "Three days of monsoon cloud",
    description:
      "The ridge walk from <a href=\"/blog/walking-the-ridge-in-monsoon\">Walking the ridge in monsoon</a>. Two views, one tea stop, and a lot of fog.",
    year: 2026,
    cover: "/images/gallery/trail-1.jpg",
    photos: photos("trail", [
      [1400, 933, "The first ridge line above the cloud", "2026-08-18"],
      [1400, 933, "A sea of cloud at sunrise", "2026-08-19"],
      [1400, 927, "A turn in the trail", "2026-08-19"],
      [1400, 933, "Mist over the forest", "2026-08-19"],
      [1400, 934, "Snow and night", "2026-08-20"],
      [1400, 933, "The valley at the end of the walk", "2026-08-20"],
    ]),
  },
  {
    slug: "city-notes",
    title: "City notes",
    subtitle: "Concrete, light and other people",
    description:
      "Frames from cities I pass through for work. Architecture, street level, and the strange quiet of a harbour at 7am.",
    year: 2025,
    cover: "/images/gallery/street-1.jpg",
    photos: photos("street", [
      [1400, 861, "Rooftops from a window seat", "2025-11-04"],
      [1400, 933, "Street corner at dusk", "2025-11-05"],
      [1400, 933, "Glass and steel", "2025-11-05"],
      [1400, 934, "A quiet doorway", "2025-11-06"],
      [1400, 2084, "Looking up between buildings", "2025-11-06"],
      [1400, 931, "The last light on the harbour", "2025-11-07"],
    ]),
  },
];
