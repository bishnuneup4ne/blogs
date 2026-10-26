import type { Author } from "@/lib/types";

export const author: Author = {
  name: "Bishnu Neupane",
  role: "Security engineer",
  avatar: "/images/avatar.svg",
};

export const guestAuthors = {
  anika: {
    name: "Anika Shrestha",
    role: "Platform engineer",
    avatar: "/images/avatar-anika.svg",
  },
  rabin: {
    name: "Rabin Gurung",
    role: "Product designer",
    avatar: "/images/avatar-rabin.svg",
  },
} satisfies Record<string, Author>;
