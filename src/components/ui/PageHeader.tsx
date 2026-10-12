import type { ReactNode } from "react";
import { Heading, Text, Flex } from "@once-ui-system/core";
import styles from "./ui.module.scss";

/**
 * Consistent page title block for every public page.
 * Replaces raw <h1> + page-shell header markup.
 */
export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <Flex fillWidth horizontal="between" vertical="end" gap="12" wrap>
        <div>
          <Heading as="h1" className={styles.title} size="l" marginBottom="0">
            {title}
          </Heading>
          {meta ? (
            <Text size="s" onBackground="neutral-weak" className={styles.meta}>
              {meta}
            </Text>
          ) : null}
        </div>
        {actions ? <Flex gap="8" vertical="center">{actions}</Flex> : null}
      </Flex>
    </header>
  );
}
