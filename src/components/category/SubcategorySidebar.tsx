"use client";

import Link from "next/link";
import styles from "@/components/categories/CategoryList.module.scss";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  count: number;
  children?: Category[];
}

interface SubcategorySidebarProps {
  subcategories: Category[];
}

export function SubcategorySidebar({ subcategories }: SubcategorySidebarProps) {
  // Only show direct subcategories (no nesting of sub-subcategories)
  const renderCategories = (cats: Category[]) => {
    return cats.map((cat, index) => (
      <div key={cat.id}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          <li>
            <Link href={`/category/${cat.slug}`} className={styles.row}>
              <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.name}>
                {cat.icon && <span style={{ marginRight: "6px" }}>{cat.icon}</span>}
                {cat.name}
              </span>
              <span className={styles.count}>
                {cat.count} {cat.count === 1 ? "post" : "posts"}
              </span>
            </Link>
          </li>
        </ul>
      </div>
    ));
  };

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {renderCategories(subcategories)}
    </ul>
  );
}
