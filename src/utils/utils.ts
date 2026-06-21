// Only import fs/path in non-build environments to avoid NFT warnings
// These are used as fallbacks in Supabase utilities
let fs: typeof import("node:fs") | null = null;
let path: typeof import("node:path") | null = null;

// Lazy load fs/path only when needed at runtime
function getFileSystem() {
  if (fs === null) {
    fs = require("node:fs");
  }
  if (path === null) {
    path = require("node:path");
  }
  return { fs, path };
}

import matter from "gray-matter";

type Team = {
  name: string;
  role: string;
  avatar: string;
  linkedIn: string;
};

type Metadata = {
  title: string;
  subtitle?: string;
  publishedAt: string;
  summary: string;
  image?: string;
  images: string[];
  tag?: string;
  category?: string;
  video_url?: string;
  team: Team[];
  link?: string;
};

function getMDXFiles(dir: string) {
  const { fs, path } = getFileSystem();
  if (!fs || !path || !fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir).filter((file) => path && path.extname(file) === ".mdx");
}

function readMDXFile(filePath: string) {
  const { fs, path } = getFileSystem();
  if (!fs || !path || !fs.existsSync(filePath)) {
    return null;
  }

  const rawContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(rawContent);

  const metadata: Metadata = {
    title: data.title || "",
    subtitle: data.subtitle || "",
    publishedAt: data.publishedAt,
    summary: data.summary || "",
    image: data.image || "",
    images: data.images || [],
    tag: data.tag || [],
    team: data.team || [],
    link: data.link || "",
  };

  return { metadata, content };
}

function getMDXData(dir: string) {
  const { path } = getFileSystem();
  const mdxFiles = getMDXFiles(dir);
  return mdxFiles
    .map((file) => {
      const parsed = readMDXFile(path ? path.join(dir, file) : `${dir}/${file}`);
      if (!parsed) return null;
      const slug = path ? path.basename(file, path.extname(file)) : file.replace(/\.mdx?$/, "");
      return { ...parsed, slug };
    })
    .filter((post): post is NonNullable<typeof post> => post !== null);
}

export function getPosts(customPath = ["", "", "", ""]) {
  const { path } = getFileSystem();
  if (!path) return [];
  const postsDir = path.join(/*turbopackIgnore: true*/ process.cwd(), ...customPath);
  return getMDXData(postsDir);
}
