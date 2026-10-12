import { Column, Heading, Meta, Schema } from "@once-ui-system/core";
import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";
import { Projects } from "@/components/work/Projects";

export async function generateMetadata() {
  const config = await getSiteConfig();
  return Meta.generate({
    title: config.work.title,
    description: config.work.description,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(config.work.title)}`,
    path: config.work.path,
  });
}

export default async function Work() {
  const config = await getSiteConfig();
  const { work, person, about } = config;
  return (
    <Column maxWidth="m" paddingTop="24">
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={work.path}
        title={work.title}
        description={work.description}
        image={`/api/og/generate?title=${encodeURIComponent(work.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <Heading marginBottom="l" variant="heading-strong-xl" align="center">
        {work.title}
      </Heading>
      <Projects />
    </Column>
  );
}
