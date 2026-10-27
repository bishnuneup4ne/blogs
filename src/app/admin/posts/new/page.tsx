"use client";

import { PostEditor } from "@/components/admin/PostEditor";
import { FeedbackProvider } from "@/components/admin/Feedback";

export default function NewPostPage() {
  return (
    <FeedbackProvider>
      <PostEditor postId="new" />
    </FeedbackProvider>
  );
}
