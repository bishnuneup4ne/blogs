"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { Button } from "@/components/admin/Button";
import { useApiCollection } from "@/components/admin/api";
import { EmptyState, Segmented, StatusChip, statusTone, Switch, Table } from "@/components/admin/kit";
import { DateCell } from "@/components/admin/kit";
import styles from "./AdminShell.module.scss";

export function AdminShell({ children }: { children?: React.ReactNode }) {
  const topicsState = useApiCollection("/api/admin/topics", "topics");
  const postsState = useApiCollection<{ id: string; title: string; slug: string }>("/api/admin/posts", "posts");
  const topics = topicsState;
  const posts = postsState;
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"posts" | "topics">("posts");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get("/api/admin/me");
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/api/admin/logout", null);
      setIsLoggedIn(false);
      window.location.href = "/admin/login";
    } catch (e) {
      useToast()(e instanceof Error ? e.message : "Logout failed", "error");
    }
  };

  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.rail}>
          <div className={styles.brand}>
            <div className={styles.brandName}>
              <span className={styles.brandPrefix}>Admin</span>
              <span className={styles.brandName}>Blog Studio</span>
            </div>
            <div className={styles.brandKicker}>bishnuneupane13.com.np</div>
          </div>
          <div className={styles.nav}>
            <div className={styles.navGroup}>
              <span className={styles.navLabel}>Posts</span>
            </div>
            <div className={styles.navGroup}>
              <Link href="/admin/posts" className={styles.navItem} onClick={() => setSelectedTab("posts")}>
                All Posts
              </Link>
            </div>
            <div className={styles.navGroup}>
              <Link href="/admin/posts/new" className={styles.navItem}>
                New Post
              </Link>
            </div>
          </div>
          <div className={styles.railFoot}>
            <button
              className={styles.viewSite}
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </div>
        <div className={styles.main}>
          <div className={styles.topbar}>
            <div className={styles.search}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input type="text" placeholder="Search..." />
            </div>
            <Button variant="text" tone="danger" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.rail}>
        <div className={styles.brand}>
          <div className={styles.brandName}>
            <span className={styles.brandPrefix}>Admin</span>
            <span className={styles.brandName}>Blog Studio</span>
          </div>
          <div className={styles.brandKicker}>bishnuneupane13.com.np</div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Posts</span>
          </div>
          <div className={styles.navGroup}>
            <Link href="/admin/posts" className={styles.navItem} onClick={() => setSelectedTab("posts")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 4h18M3 12h18M3 20h18" />
              </svg>
              Posts
            </Link>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Topics</span>
          </div>
          <div className={styles.navGroup}>
            <Link href="/admin/topics" className={styles.navItem} onClick={() => setSelectedTab("topics")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 4h18M3 12h18M3 20h18" />
              </svg>
              Topics
            </Link>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Settings</span>
          </div>
          <div className={styles.navGroup}>
            <Link href="/admin/settings" className={styles.navItem}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Settings
            </Link>
          </div>
        </nav>

        <div className={styles.railFoot}>
          <button className={styles.signOut} onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18c1.5-1.5 1.5-4 0-5.5L3 7l9-6 9 6-9 6z" />
              <path d="M3 12h18" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.actions}>
            <Button variant="outlined" onClick={() => setSelectedTab("posts")}>
              Posts
            </Button>
            <Button variant="outlined" onClick={() => setSelectedTab("topics")}>
              Topics
            </Button>
            <Button tone="blue" onClick={() => { window.location.href = "/admin/posts/new"; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Post
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === "posts" && <PostsTab posts={posts} topics={topics} setSelectedTab={setSelectedTab} />}
        {selectedTab === "topics" && <TopicsTab topics={topics} setSelectedTab={setSelectedTab} />}
      </div>
    </div>
  );
}

function PostsTab({ posts, topics, setSelectedTab }: { posts: any; topics: any; setSelectedTab: any }) {
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");

  const filteredPosts = posts.items.filter((p: any) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.content}>
      <div className={styles.toolbar}>
        <div className={styles.controls}>
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "table", label: "Table", count: filteredPosts.length },
              { value: "grid", label: "Grid", count: filteredPosts.length },
            ]}
          />
          <div className={styles.search}>
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Button tone="blue" onClick={() => { window.location.href = "/admin/posts/new"; }}>
          New Post
        </Button>
      </div>

      {filteredPosts.length === 0 ? (
        <EmptyState
          title="No posts found"
          body="Try adjusting your search or create a new post."
          action="New post"
          href="/admin/posts/new"
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Topic</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map((post: any) => (
              <tr key={post.id}>
                <td className={styles.postTitle}>{post.title}</td>
                <td><StatusChip status={post.status} tone={statusTone(post.status)} /></td>
                <td>{topics.items.find((t: any) => t.slug === post.topic_slug)?.name ?? "Uncategorized"}</td>
                <td>
                  <Button size="sm" variant="outlined" onClick={() => window.location.href = `/admin/posts/${post.id}/edit`}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outlined" tone="danger" onClick={() => { window.location.href = `/admin/posts/${post.id}?hard=1`; }}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function TopicsTab({ topics, setSelectedTab }: { topics: any; setSelectedTab: any }) {
  return (
    <div className={styles.content}>
      <div className={styles.toolbar}>
        <Button tone="blue" onClick={() => { window.location.href = "/admin/topics/new"; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Topic
        </Button>
      </div>

      {topics.items.length === 0 ? (
        <EmptyState
          title="No topics found"
          body="Create your first topic to organize posts."
          action="Create topic"
          href="/admin/topics/new"
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Topic</th>
              <th>Posts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {topics.items.map((topic: any) => (
              <tr key={topic.id}>
                <td>{topic.name}</td>
                <td>{topic.postCount || 0}</td>
                <td>
                  <Button size="sm" variant="outlined" onClick={() => window.location.href = `/admin/topics/${topic.id}/edit`}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export default AdminShell;