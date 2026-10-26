"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./SearchFilters.module.scss";

type Sort = "relevance" | "newest" | "oldest";

const SORTS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export function SearchFiltersBar({
  total,
  topics,
}: {
  total: number;
  topics: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const topic = params.get("topic") ?? "";
  const sort = (params.get("sort") as Sort) || "relevance";
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(null);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
    setOpen(null);
  }

  const hasFilters = Boolean(topic || q);

  return (
    <div className={styles.bar} ref={wrapRef}>
      <div className={styles.left}>
        <h2 className={styles.heading}>Filter results</h2>
        <div className={styles.dropdowns}>
          <Dropdown
            id="topic"
            label="By Topic"
            open={open === "topic"}
            onToggle={() => setOpen(open === "topic" ? null : "topic")}
            onClose={() => setOpen(null)}
            options={topics.map((t) => ({ value: t.slug, label: t.name }))}
            value={topic}
            onSelect={(v) => setParam("topic", v)}
          />
          {hasFilters ? (
            <Link href="/search" className={`${styles.clear} pill`}>Clear all</Link>
          ) : null}
        </div>
      </div>

      <div className={styles.right}>
        <p className={styles.count}>
          {total} matching {total === 1 ? "result" : "results"}.
        </p>
        <Dropdown
          id="sort"
          label={`Sort by: ${SORTS.find((s) => s.value === sort)?.label ?? "Relevance"}`}
          inlineLabel
          open={open === "sort"}
          onToggle={() => setOpen(open === "sort" ? null : "sort")}
          onClose={() => setOpen(null)}
          options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
          value={sort}
          onSelect={(v) => setParam("sort", v)}
        />
      </div>
    </div>
  );
}

function Dropdown({
  id,
  label,
  options,
  value,
  onSelect,
  open,
  onToggle,
  onClose,
  inlineLabel = false,
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  inlineLabel?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
  }, [open]);

  function move(event: React.KeyboardEvent<HTMLUListElement>) {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      items[(index + offset + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    }
  }

  return (
    <div className={styles.dd}>
      <button
        ref={buttonRef}
        id={`${id}-button`}
        type="button"
        className={inlineLabel ? styles.ddInline : styles.ddButton}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        {label}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={open ? styles.chevronOpen : undefined}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <ul className={styles.menu} role="listbox" aria-labelledby={`${id}-button`} ref={listRef} onKeyDown={move}>
          <li role="presentation">
            <button type="button" role="option" aria-selected={!value} className={!value ? styles.optionActive : styles.option} onClick={() => onSelect("")}>
              Any
            </button>
          </li>
          {options.map((o) => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === o.value}
                className={value === o.value ? styles.optionActive : styles.option}
                onClick={() => onSelect(o.value)}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
