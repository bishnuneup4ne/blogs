import styles from "./Button.module.scss";

export function Button({
  children,
  variant = "filled",
  size = "md",
  tone = "blue",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "filled" | "outlined" | "text";
  size?: "sm" | "md";
  tone?: "blue" | "danger";
}) {
  return (
    <button
      type="button"
      {...rest}
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${styles[tone]} ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}
