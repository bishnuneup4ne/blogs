import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "@/resources/custom.css";

import classNames from "classnames";

import { Meta } from "@once-ui-system/core";
import { baseURL, fonts, style, dataStyle } from "@/resources";
import { SiteChrome } from "@/components/SiteChrome";
import { getSiteConfig } from "@/lib/config";

export async function generateMetadata() {
  const config = await getSiteConfig();
  return Meta.generate({
    title: config.home.title,
    description: config.home.description,
    baseURL: baseURL,
    path: config.home.path,
    image: config.home.image,
  });
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();

  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
      data-suppress-hydration-warning={true}
      className={classNames(
        fonts.heading.variable,
        fonts.body.variable,
        fonts.label.variable,
        fonts.code.variable,
      )}
    >
      <head suppressHydrationWarning data-suppress-hydration-warning>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const root = document.documentElement;
                  const config = ${JSON.stringify({
                    brand: style.brand,
                    accent: style.accent,
                    neutral: style.neutral,
                    solid: style.solid,
                    "solid-style": style.solidStyle,
                    border: style.border,
                    surface: style.surface,
                    transition: style.transition,
                    scaling: style.scaling,
                    "viz-style": dataStyle.variant,
                  })};
                  
                  // Apply config attributes
                  Object.entries(config).forEach(([key, value]) => {
                    root.setAttribute('data-' + key, value);
                  });
                  
                  // Determine theme
                  const savedTheme = localStorage.getItem('data-theme');
                  let theme = 'dark'; // default
                  
                  if (savedTheme) {
                    theme = savedTheme;
                  } else {
                    // Check system preference
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  
                  // Apply theme immediately
                  root.setAttribute('data-theme', theme);
                  
                  // Apply any other saved attributes
                  Object.keys(config).forEach(key => {
                    const value = localStorage.getItem('data-' + key);
                    if (value) root.setAttribute('data-' + key, value);
                  });
                } catch (e) {
                  // Fallback
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var ATTRS = ["bis_use", "bis_skin_checked", "data-bis-config", "data-dynamic-id", "data-new-gr-c-s-check-loaded", "data-gr-extension-installed"];
                function strip(el) {
                  if (!el || el.nodeType !== 1) return;
                  for (var i = 0; i < ATTRS.length; i++) {
                    if (el.hasAttribute(ATTRS[i])) el.removeAttribute(ATTRS[i]);
                  }
                  if (el.src && el.src.includes('chrome-extension://')) {
                    el.removeAttribute('src');
                  }
                }
                function stripTree(root) {
                  strip(root);
                  if (!root.querySelectorAll) return;
                  var nodes = root.querySelectorAll(ATTRS.map(function (a) { return "[" + a + "]"; }).join(","));
                  for (var j = 0; j < nodes.length; j++) strip(nodes[j]);
                }
                stripTree(document.documentElement);
                new MutationObserver(function (records) {
                  for (var r = 0; r < records.length; r++) {
                    var t = records[r].target;
                    if (t && t.nodeType === 1) strip(t);
                  }
                }).observe(document.documentElement, {
                  attributes: true,
                  subtree: true,
                  attributeFilter: ATTRS,
                });
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <SiteChrome config={config}>{children}</SiteChrome>
      </body>
    </html>
  );
}
