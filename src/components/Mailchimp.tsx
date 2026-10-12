"use client";

import { mailchimp } from "@/resources";
import { useConfig } from "@/components/ConfigProvider";
import { Heading, Input, Text, Background, Column, Row } from "@once-ui-system/core";
import { ClientOnly } from "@/components/ClientOnly";
import styles from "./Mailchimp.module.scss";
import { opacity, SpacingToken } from "@once-ui-system/core";
import { useState } from "react";

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  }) as T;
}

export const Mailchimp: React.FC<React.ComponentProps<typeof Column>> = ({ ...flex }) => {
  const { newsletter, person } = useConfig();
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
      background="surface"
      border="neutral-alpha-weak"
      style={{
        position: "relative",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(128, 128, 128, 0.15)",
        transition: "all 0.3s ease",
      }}
      {...flex}
    >
      <ClientOnly>
        <Background
          top="0"
          position="absolute"
          mask={{
            x: mailchimp.effects.mask.x,
            y: mailchimp.effects.mask.y,
            radius: mailchimp.effects.mask.radius,
            cursor: mailchimp.effects.mask.cursor,
          }}
          gradient={{
            display: mailchimp.effects.gradient.display,
            opacity: mailchimp.effects.gradient.opacity as opacity,
            x: mailchimp.effects.gradient.x,
            y: mailchimp.effects.gradient.y,
            width: mailchimp.effects.gradient.width,
            height: mailchimp.effects.gradient.height,
            tilt: mailchimp.effects.gradient.tilt,
            colorStart: mailchimp.effects.gradient.colorStart,
            colorEnd: mailchimp.effects.gradient.colorEnd,
          }}
          dots={{
            display: mailchimp.effects.dots.display,
            opacity: mailchimp.effects.dots.opacity as opacity,
            size: mailchimp.effects.dots.size as SpacingToken,
            color: mailchimp.effects.dots.color,
          }}
          grid={{
            display: mailchimp.effects.grid.display,
            opacity: mailchimp.effects.grid.opacity as opacity,
            color: mailchimp.effects.grid.color,
            width: mailchimp.effects.grid.width,
            height: mailchimp.effects.grid.height,
          }}
          lines={{
            display: mailchimp.effects.lines.display,
            opacity: mailchimp.effects.lines.opacity as opacity,
            size: mailchimp.effects.lines.size as SpacingToken,
            thickness: mailchimp.effects.lines.thickness,
            angle: mailchimp.effects.lines.angle,
            color: mailchimp.effects.lines.color,
          }}
        />
      </ClientOnly>
      <Column maxWidth="xs" horizontal="center">
        <Heading marginBottom="s" variant="display-strong-xs">
          {newsletter.title}
        </Heading>
        <Text wrap="balance" marginBottom="l" variant="body-default-l" onBackground="neutral-weak">
          {newsletter.description}
        </Text>
      </Column>
      <form
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
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
        <Row
          fillWidth
          maxWidth={24}
          s={{ direction: "column" }}
          gap="8"
        >
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
