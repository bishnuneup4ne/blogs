import { Column, Flex } from "@once-ui-system/core";
import { UnsubscribeConfirm } from "@/components/UnsubscribeConfirm";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const email = await verifyUnsubscribeToken(t);

  return (
    <Flex maxWidth="m" horizontal="center" paddingY="80" fillWidth>
      <Column fillWidth>
        <UnsubscribeConfirm email={email ?? undefined} token={t} />
      </Column>
    </Flex>
  );
}
