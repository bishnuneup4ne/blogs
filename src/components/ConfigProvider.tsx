"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { Person, Social, Newsletter, Home, About, Blog, Work, Gallery } from "@/types";

export type SiteConfig = {
  person: Person;
  newsletter: Newsletter;
  social: Social;
  home: Home;
  about: About;
  blog: Blog;
  work: Work;
  gallery: Gallery;
};

const ConfigContext = createContext<SiteConfig | null>(null);

export const ConfigProvider = ({ config, children }: { config: SiteConfig; children: ReactNode }) => {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};
