/**
 * Reading material and links referenced across the site, grouped by the field
 * they belong to. Kept here rather than in article bodies so a resource can be
 * corrected once and every reader benefits.
 */

export interface Resource {
  title: string;
  href: string;
  kind: "Book" | "Course" | "Reference" | "Article" | "Video" | "Tool";
  by?: string;
  note: string;
}

export interface ResourceGroup {
  id: string;
  title: string;
  lede: string;
  items: Resource[];
}

export const resourceGroups: ResourceGroup[] = [
  {
    id: "computer-science",
    title: "Computer science fundamentals",
    lede: "Start here if you want to understand the machine from the bottom up. Ordered from most approachable to most rigorous.",
    items: [
      {
        title: "Nand2Tetris",
        href: "https://www.nand2tetris.org/",
        kind: "Course",
        by: "Shimon Schocken & Noam Nisan",
        note: "Build a working computer from a single NAND gate, in twelve projects. The best structured track there is.",
      },
      {
        title: "Computer Organization and Design",
        href: "https://www.elsevier.com/books/computer-organization-and-design-mips-edition/patterson/978-0-12-820109-1",
        kind: "Book",
        by: "Patterson & Hennessy",
        note: "The textbook most undergraduate courses use. Covers instruction sets, the datapath, pipelining and memory.",
      },
      {
        title: "Computer Systems: A Programmer's Perspective",
        href: "https://csapp.cs.cmu.edu/",
        kind: "Book",
        by: "Bryant & O'Hallaron",
        note: "How source code becomes machine behaviour — linking, virtual memory, concurrency, performance.",
      },
      {
        title: "Modern Operating Systems",
        href: "https://www.pearson.com/store/p/modern-operating-systems/P100000869738",
        kind: "Book",
        by: "Andrew Tanenbaum",
        note: "Processes, scheduling, virtual memory and I/O, explained with unusual clarity.",
      },
      {
        title: "Intel 64 and IA-32 Architectures Software Developer's Manual",
        href: "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html",
        kind: "Reference",
        by: "Intel",
        note: "The authoritative x86 instruction-set reference. Volume 1 covers the architecture itself.",
      },
    ],
  },
  {
    id: "hardware",
    title: "Hardware and architecture",
    lede: "For when you want to see the physical machine, not just the model of it.",
    items: [
      {
        title: "Ben Eater — 8-bit computer",
        href: "https://eater.net/8bit",
        kind: "Video",
        by: "Ben Eater",
        note: "A complete CPU assembled on breadboards and explained step by step, from clock to instruction.",
      },
      {
        title: "Learn how computers add numbers",
        href: "https://www.youtube.com/watch?v=wvJc9CZcvBc",
        kind: "Video",
        by: "Ben Eater",
        note: "Builds a 4-bit adder from logic gates — the exact step from switches to arithmetic.",
      },
      {
        title: "CPU cache",
        href: "https://en.wikipedia.org/wiki/CPU_cache",
        kind: "Reference",
        note: "Overview of associativity, replacement policy and cache coherence.",
      },
      {
        title: "Memory paging",
        href: "https://en.wikipedia.org/wiki/Memory_paging",
        kind: "Reference",
        note: "How the memory management unit translates virtual addresses into physical ones.",
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    lede: "Practical references for application security, incident response and the boundaries discussed in the articles.",
    items: [
      {
        title: "OWASP Top Ten",
        href: "https://owasp.org/www-project-top-ten/",
        kind: "Reference",
        by: "OWASP",
        note: "The most common classes of web application vulnerability, with remediation guidance.",
      },
      {
        title: "The Web Application Hacker's Handbook",
        href: "https://www.wiley.com/en-us/The+Web+Application+Hacker%27s+Handbook%3A+Finding+and+Exploiting+Security+Flaws%2C+2nd+Edition-p-9781118026472",
        kind: "Book",
        by: "Stuttard & Pinto",
        note: "Still the most complete practical treatment of web application testing.",
      },
      {
        title: "Google Online Security Blog",
        href: "https://security.googleblog.com/",
        kind: "Article",
        note: "Primary-source write-ups of real vulnerabilities and mitigations, often by the engineers who found them.",
      },
    ],
  },
  {
    id: "photography",
    title: "Photography",
    lede: "What I read and re-read on light, framing and the discipline of a camera.",
    items: [
      {
        title: "Magnum Photos",
        href: "https://www.magnumphotos.com/",
        kind: "Reference",
        note: "The archive I return to most often. Study the framing before the subject.",
      },
    ],
  },
];
