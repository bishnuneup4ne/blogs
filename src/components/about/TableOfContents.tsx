"use client";

import { Column, SmartLink, Text } from "@once-ui-system/core";

type TocItem = {
  title: string;
  display: boolean;
  items: string[];
};

type TableOfContentsProps = {
  structure: TocItem[];
  about?: {
    path?: string;
  };
};

export default function TableOfContents({ structure }: TableOfContentsProps) {
  const entries = structure.filter((section) => section.display);

  if (!entries.length) {
    return null;
  }

  return (
    <Column gap="8" padding="16" radius="l" background="surface" border="neutral-alpha-weak">
      <Text variant="label-strong-s" onBackground="neutral-weak">
        Contents
      </Text>
      <Column gap="4">
        {entries.map((section) => (
          <SmartLink key={section.title} href={`#${section.title}`}>
            <Text variant="body-default-s">{section.title}</Text>
          </SmartLink>
        ))}
      </Column>
    </Column>
  );
}
