import type { Category, CategorySlug } from "./types";

export const categories: Category[] = [
  {
    slug: "engineering",
    name: "Engineering",
    description:
      "Architecture decisions, performance work and the tools I keep coming back to.",
    color: "#1a73e8",
    pastel: "blue",
  },
  {
    slug: "security",
    name: "Security",
    description:
      "AppSec, offensive tooling and post-mortems from things that should never have shipped.",
    color: "#d93025",
    pastel: "red",
  },
  {
    slug: "field-notes",
    name: "Field notes",
    description:
      "Short, unpolished observations from a week of building. Less essay, more notebook.",
    color: "#188038",
    pastel: "green",
  },
  {
    slug: "life",
    name: "Life",
    description:
      "Training, travel, books and the discipline of staying curious outside the terminal.",
    color: "#b06000",
    pastel: "yellow",
  },
  {
    slug: "photography",
    name: "Photography",
    description:
      "Frames from Kathmandu, the trail, and whatever light happens to find me.",
    color: "#8430ce",
    pastel: "purple",
  },
  {
    slug: "essays",
    name: "Essays",
    description:
      "Longer arguments about craft, attention and building things that outlast a trend.",
    color: "#0b8043",
    pastel: "green",
  },
];

const bySlug = new Map(categories.map((c) => [c.slug, c]));

export function getCategory(slug: CategorySlug): Category {
  const category = bySlug.get(slug);
  if (category) return category;
  const name = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return {
    slug,
    name: name || "Uncategorised",
    description: "Posts filed under this topic.",
    color: "#5f6368",
    pastel: "gray",
  };
}
