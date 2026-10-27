"use client";

import { use } from "react";
import { PostEditor } from "@/components/admin/PostEditor";
import { FeedbackProvider } from "@/components/admin/Feedback";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <FeedbackProvider>
      <PostEditor postId={id} />
    </FeedbackProvider>
  );
}
