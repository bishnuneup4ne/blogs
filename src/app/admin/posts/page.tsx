"use client";

import Link from "next/link";
import { PostsTable } from "@/components/admin/PostsTable";
import { PageHeader } from "@/components/admin/kit";

export default function AdminPostsPage() {
  return (
    <div>
      <PageHeader
        title="Posts"
        description="Write, review and publish. Drafts are visible only in Studio."
        actions={
          <Link href="/admin/posts/new" className="btn btn-primary">New post</Link>
        }
      />
      <PostsTable />
    </div>
  );
}
