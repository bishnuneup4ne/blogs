import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";
import { getSupabasePosts } from "@/utils/supabasePosts";
import { NextResponse } from "next/server";

function xmlEscape(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdataEscape(s: string): string {
  // terminate and re-open CDATA around any closing sequence
  return String(s ?? "").replace(/]]>/g, "]]]]><![CDATA[>");
}

export async function GET() {
  const config = await getSiteConfig();
  const { blog, person } = config;
  const posts = await getSupabasePosts();

  // Sort posts by date (newest first)
  const sortedPosts = posts.sort((a, b) => {
    return new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime();
  });

  const title = xmlEscape(blog.title);
  const description = xmlEscape(blog.description);
  const authorName = xmlEscape(person.name);
  const authorEmail = xmlEscape(person.email || "noreply@example.com");

  // Generate RSS XML
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <link>${baseURL}/blog</link>
    <description>${description}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseURL}/api/rss" rel="self" type="application/rss+xml" />
    <managingEditor>${authorEmail} (${authorName})</managingEditor>
    <webMaster>${authorEmail} (${authorName})</webMaster>
    <image>
      <url>${baseURL}${person.avatar || "/images/avatar.jpg"}</url>
      <title>${title}</title>
      <link>${baseURL}/blogs</link>
    </image>
    ${sortedPosts
      .map(
        (post) => `
    <item>
      <title>${xmlEscape(post.metadata.title)}</title>
      <link>${baseURL}/blogs/${encodeURIComponent(post.slug)}</link>
      <guid>${baseURL}/blogs/${encodeURIComponent(post.slug)}</guid>
      <pubDate>${new Date(post.metadata.publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${cdataEscape(post.metadata.summary)}]]></description>
      ${post.metadata.image ? `<enclosure url="${xmlEscape(baseURL + post.metadata.image)}" type="image/jpeg" />` : ""}
      ${post.metadata.tag ? `<category>${xmlEscape(post.metadata.tag)}</category>` : ""}
      <author>${authorEmail} (${authorName})</author>
    </item>`,
      )
      .join("")}
  </channel>
</rss>`;

  // Return the RSS XML with the appropriate content type
  return new NextResponse(rssXml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
