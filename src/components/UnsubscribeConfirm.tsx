"use client";

import { useState } from "react";
import { Button, Column, Heading, Input, Text } from "@once-ui-system/core";

type Status = "idle" | "working" | "done" | "error";

export function UnsubscribeConfirm({ email, token }: { email?: string; token?: string }) {
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const target = email ?? typed.trim();

  const confirm = async () => {
    if (!target) {
      setStatus("error");
      setMessage("Enter the email address you subscribed with.");
      return;
    }

    setStatus("working");
    setMessage("");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { t: token } : { email: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("done");
        setMessage(data.message || "You've been unsubscribed.");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Please check your connection and try again.");
    }
  };

  if (status === "done") {
    return (
      <Column
        gap="12"
        padding="40"
        radius="l"
        border="neutral-alpha-weak"
        background="surface"
      >
        <Heading variant="heading-strong-l">You're unsubscribed</Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {target} will no longer receive updates from this blog.
        </Text>
      </Column>
    );
  }

  return (
    <Column
      gap="16"
      padding="40"
      radius="l"
      border="neutral-alpha-weak"
      background="surface"
    >
      <Heading variant="heading-strong-l">Unsubscribe from updates?</Heading>
      <Text variant="body-default-m" onBackground="neutral-weak">
        Emails will stop being sent to <strong>{target || "your address"}</strong>. You can
        subscribe again at any time.
      </Text>

      {!email && (
        <Input
          id="unsubscribe-email"
          name="email"
          type="email"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="you@example.com"
        />
      )}

      {status === "error" && (
        <Text variant="body-default-s" onBackground="danger-strong">
          {message}
        </Text>
      )}

      <Button variant="primary" size="m" onClick={confirm} disabled={status === "working"}>
        {status === "working" ? "Unsubscribing…" : "Confirm unsubscribe"}
      </Button>
    </Column>
  );
}
