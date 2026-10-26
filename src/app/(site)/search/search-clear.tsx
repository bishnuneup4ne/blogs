"use client";

import styles from "./search.module.scss";

export function SearchClear() {
  return (
    <button
      type="button"
      className={styles.clear}
      aria-label="Clear search"
      onClick={() => {
        const form = document.getElementById("search-form") as HTMLFormElement | null;
        form?.reset();
        form?.querySelector("input")?.focus();
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
