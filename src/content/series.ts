import type { Series } from "@/lib/types";

/* Curated reading orders. A series only appears on the site when every one of
   its posts is published, so file and database content stay consistent. */
export const series: Series[] = [
  {
    slug: "reliable-systems",
    title: "Reliable systems",
    description:
      "What actually keeps a service up: observability you trust, postmortems that lead somewhere, and deploying without white gloves.",
    posts: [
      { slug: "observability-that-earns-its-keep", title: "Observability that earns its keep" },
      { slug: "what-a-good-postmortem-looks-like", title: "What a good postmortem looks like" },
      { slug: "deploying-without-fear", title: "Deploying without fear" },
    ],
  },
  {
    slug: "writing-for-developers",
    title: "Writing for developers",
    description:
      "Notes on the craft side of engineering communication — typography, structure, and the opinions behind them.",
    posts: [
      { slug: "notes-on-typography-for-developers", title: "Notes on typography for developers" },
      { slug: "small-software-strong-opinions", title: "Small software, strong opinions" },
    ],
  },
];
