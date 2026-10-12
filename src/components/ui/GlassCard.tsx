import { Card } from "@once-ui-system/core";
import classNames from "classnames";
import styles from "./ui.module.scss";

/** once-ui Card with the frosted-glass surface treatment. */
export function GlassCard({
  children,
  className,
  interactive = true,
  ...props
}: React.ComponentProps<typeof Card> & { interactive?: boolean }) {
  return (
    <Card
      className={classNames(interactive ? styles.glassCard : styles.glassPanel, className)}
      background="transparent"
      border="transparent"
      {...props}
    >
      {children}
    </Card>
  );
}
