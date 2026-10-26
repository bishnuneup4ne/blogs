import type { Author } from "@/lib/types";

export const author: Author = {
  name: "Bishnu Neupane",
  role: "Security engineer",
  avatar: "/avatar.jpg",
};

export const guestAuthors = {
  anika: {
    name: "Anika Shrestha",
    role: "Platform engineer",
    avatar: "/avatar.jpg",
  },
  rabin: {
    name: "Rabin Gurung",
    role: "Product designer",
    avatar: "/avatar.jpg",
  },
} satisfies Record<string, Author>;
