import Link from "next/link";
import type { CategoryWithCount } from "@/lib/categories";
import styles from "./CategoryList.module.scss";

type CategoryListProps = {
  categories: CategoryWithCount[];
};

export function CategoryList({ categories }: CategoryListProps) {
  return (
    <ul className={styles.list}>
      {categories.map((cat, index) => (
        <li key={cat.id}>
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
