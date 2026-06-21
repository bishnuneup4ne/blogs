"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "../AdminSidebar";
import { useAdminToast } from "@/lib/adminToast";

interface Subscriber {
  id: string;
  email: string;
  status: string;
  subscribed_at: string;
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { addToast } = useAdminToast();

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscribers");
      if (res.ok) setSubscribers(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSendEmail = async () => {
    if (!subject || !message) {
      addToast("error", "Please provide both a subject and a message.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", data.message || "Email sent successfully!");
        setSubject("");
        setMessage("");
      } else {
        addToast("error", data.error || "Failed to send email.");
      }
    } catch {
      addToast("error", "Network error while sending.");
    }
    setSending(false);
  };

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Subscribers & Mailing</h1>
            <p className="admin-page-subtitle">
              Manage your newsletter subscribers and send them updates.
            </p>
          </div>
        </div>

        <div className="form-row">
          <div className="admin-card">
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Mailing List</h3>
            <p className="text-muted text-small" style={{ marginBottom: "16px" }}>
              {loading ? "Loading..." : `${activeCount} active subscribers`}
            </p>
            <div className="table-responsive" style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", padding: "2rem" }}>
                        No subscribers yet.
                      </td>
                    </tr>
                  )}
                  {subscribers.map((sub) => (
                    <tr key={sub.id}>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{sub.email}</td>
                      <td>
                        <span className={`badge ${sub.status === "active" ? "badge-published" : "badge-draft"}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="text-muted text-small">
                        {new Date(sub.subscribed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card">
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Send Email Broadcast</h3>
            <p className="text-muted text-small" style={{ marginBottom: "16px" }}>
              Draft an email to all active subscribers.
            </p>

            <div className="admin-form">
              <div className="form-field">
                <label className="form-label">Subject</label>
                <input
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. New Blog Post Published!"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Message (HTML supported)</label>
                <textarea
                  className="form-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="<p>Hello world!</p>"
                  rows={10}
                  style={{ fontFamily: "monospace" }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSendEmail}
                disabled={sending || activeCount === 0}
              >
                {sending ? "Sending..." : `Send to ${activeCount} subscribers`}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
