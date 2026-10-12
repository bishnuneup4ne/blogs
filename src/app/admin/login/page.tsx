"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Column, Heading, Input, Text } from "@once-ui-system/core";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("next") || searchParams.get("from") || "/admin";
  // Only allow same-site admin paths — never an absolute URL.
  const safeFrom = from.startsWith("/admin") && !from.startsWith("//") ? from : "/admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(safeFrom);
      router.refresh();
      return;
    }

    let message = "Invalid password. Access denied.";
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // keep the default message
    }
    setError(message);
    setLoading(false);
  };

  return (
    <Column
      fillWidth
      horizontal="center"
      vertical="center"
      minHeight="100dvh"
      padding="l"
      suppressHydrationWarning
    >
      <Card
        className="glass-card"
        background="transparent"
        border="transparent"
        padding="24"
        radius="l"
        style={{ width: "min(440px, 100%)" }}
      >
        <Column fillWidth gap="8" marginBottom="24">
          <Heading as="h1" size="l">
            Admin Panel
          </Heading>
          <Text size="s" onBackground="neutral-weak">
            Secure access required to continue
          </Text>
        </Column>

        <form onSubmit={handleLogin}>
          <Column fillWidth gap="16">
            <Input
              id="admin-password"
              type="password"
              label="Password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(error)}
              errorMessage={error || undefined}
              autoFocus
              required
            />
            <Button type="submit" variant="primary" fillWidth loading={loading}>
              {loading ? "Authenticating…" : "Access Dashboard"}
            </Button>
          </Column>
        </form>
      </Card>
    </Column>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <Column fillWidth horizontal="center" vertical="center" minHeight="100dvh">
          <Text size="s" onBackground="neutral-weak">
            Loading…
          </Text>
        </Column>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
