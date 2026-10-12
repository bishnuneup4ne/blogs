import { Column, Heading, Icon, Row, Text } from "@once-ui-system/core";
import styles from "./EmptyState.module.scss";

export function EmptyState({
  icon = "play",
  title,
  description,
}: {
  icon?: "play" | "plus" | "screen" | "sparkle" | "check" | "arrowUpRight";
  title: string;
  description: string;
}) {
  return (
    <Column
      fillWidth
      horizontal="center"
      padding="40"
      radius="l"
      border="neutral-alpha-weak"
      background="surface"
    >
      <Column maxWidth="m" horizontal="center" align="center" gap="12">
        <Row
          horizontal="center"
          vertical="center"
          radius="full"
          border="neutral-alpha-weak"
          background="neutral-alpha-weak"
          className={styles.icon}
        >
          <Icon name={icon} size="l" onBackground="neutral-strong" />
        </Row>
        <Heading variant="heading-strong-m" align="center">
          {title}
        </Heading>
        <Text
          variant="body-default-s"
          onBackground="neutral-weak"
          align="center"
          wrap="balance"
        >
          {description}
        </Text>
      </Column>
    </Column>
  );
}
