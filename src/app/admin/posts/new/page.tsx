"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiPost } from "@/components/admin/api";
import { PostEditor } from "@/components/admin/PostEditor";

export default function NewPostPage() {
  const router = useRouter();
  const [postId, setPostId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .post<{ post: ApiPost }>("/api/admin/posts", {
        title: "Untitled draft",
        status: "draft",
        blocks: [{ type: "p", html: "" }],
      })
      .then((d) => alive && setPostId(d.post.id))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Could not start a new post"));
    return () => {
      alive = false;
    };
  }, []);

  if (error)
    return (
      <div>
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => router.push("/admin/posts")}>
          Back to posts
        </button>
      </div>
    );
  if (!postId) return <p>Loading…</p>;
  return <PostEditor postId={postId} />;
}
