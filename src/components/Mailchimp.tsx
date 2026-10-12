"use client";

import { useConfig } from "@/components/ConfigProvider";
import { Heading, Input, Text, Column, Row } from "@once-ui-system/core";
import styles from "./Mailchimp.module.scss";
import { useState } from "react";

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  }) as T;
}

export const Mailchimp: React.FC<React.ComponentProps<typeof Column>> = ({ ...flex }) => {
  const { newsletter } = useConfig();
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [touched, setTouched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const validateEmail = (email: string): boolean => {
    if (email === "") {
      return true;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (!validateEmail(value)) {
      setError("Please enter a valid email address.");
    } else {
      setError("");
    }
  };

  const debouncedHandleChange = debounce(handleChange, 2000);

  const handleBlur = () => {
    setTouched(true);
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
    }
  };

  if (newsletter.display === false) return null;

  return (
    <Column
      overflow="hidden"
      fillWidth
      padding="xl"
      radius="l"
      marginBottom="m"
      horizontal="center"
      align="center"
      className={styles.card}
      {...flex}
    >
      <Column maxWidth="m" horizontal="center" marginBottom="l" className={styles.copy}>
        <Heading marginBottom="s" variant="display-strong-xs">
          {newsletter.title}
        </Heading>
        <Text wrap="balance" variant="body-default-l" onBackground="neutral-weak">
          {newsletter.description}
        </Text>
      </Column>
      <form
        className={styles.form}
        onSubmit={async (e) => {
          e.preventDefault();
          if (error) return;
          if (!email.trim()) {
            setError("Please enter your email.");
            return;
          }
          setLoading(true);
          try {
            const res = await fetch("/api/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error || "Failed to subscribe");
            } else {
              setSuccess(true);
              setEmail("");
            }
          } catch (err) {
            setError("Network error. Please try again.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <Row fillWidth maxWidth="40" s={{ direction: "column" }} gap="8">
          {success ? (
            <Row height="48" vertical="center" horizontal="center" fillWidth>
              <Text variant="body-default-m" onBackground="success-medium">
                Successfully subscribed! 🎉
              </Text>
            </Row>
          ) : (
            <>
              <Input
                id="newsletter-email"
                name="email"
                type="email"
                placeholder="Email address"
                required
                value={email}
                onChange={(e) => {
                  if (error) {
                    handleChange(e);
                  } else {
                    debouncedHandleChange(e);
                    setEmail(e.target.value);
                  }
                }}
                onBlur={handleBlur}
                errorMessage={error}
              />
              <Row height="48" vertical="center" fillWidth>
                <button
                  type="submit"
                  className={styles.subscribeBtn}
                  disabled={loading || !!error || !email}
                >
                  {loading ? "Subscribing..." : "Subscribe"}
                </button>
              </Row>
            </>
          )}
        </Row>
      </form>
    </Column>
  );
};
