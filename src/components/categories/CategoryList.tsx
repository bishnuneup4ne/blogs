"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import type { CategoryWithCount } from "@/lib/categories";
import styles from "./CategoryList.module.scss";

type CategoryListProps = {
  categories: CategoryWithCount[];
};

export function CategoryList({ categories }: CategoryListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (!listRef.current) return;
    const rows = listRef.current.querySelectorAll("[data-category-row]");
    const tween = gsap.fromTo(
      rows,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power2.out" },
    );
    return () => {
      tween.revert();
    };
  }, [categories]);

  return (
    <ul ref={listRef} className={styles.list}>
      {categories.map((cat, index) => (
        <li key={cat.id} className={styles.item} data-category-row>
          <Link href={`/category/${cat.slug}`} className={styles.row}>
            <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.name}>{cat.name}</span>
            <span className={styles.count}>
              {cat.count} {cat.count === 1 ? "post" : "posts"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
