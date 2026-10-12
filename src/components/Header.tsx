"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import classNames from "classnames";
import { display, routes } from "@/resources";
import { iconLibrary } from "@/resources/icons";
import { useConfig } from "@/components/ConfigProvider";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.scss";

const BlogIcon = iconLibrary.book;
const VideoIcon = iconLibrary.document;

type NavLinkProps = {
  href: string;
  selected: boolean;
  children: ReactNode;
};

function NavLink({ href, selected, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={classNames(styles.navLink, selected && styles.navLinkSelected)}
      aria-current={selected ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

type NavDropdownProps = {
  selected: boolean;
  children: ReactNode;
  dropdownItems: { label: string; href: string; icon?: any }[];
  isIconDropdown?: boolean;
};

function NavDropdown({ selected, children, dropdownItems, isIconDropdown = false }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div
      className={styles.dropdownContainer}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={classNames(styles.navLink, selected && styles.navLinkSelected)}>
        {children}
      </div>
      {isOpen && (
        <div className={classNames(styles.dropdown, isIconDropdown && styles.dropdownIcon)}>
          {dropdownItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames(styles.dropdownItem, isIconDropdown && styles.dropdownItemIcon)}
              >
                {isIconDropdown && Icon ? (
                  <div className={styles.dropdownItemContent}>
                    <Icon size={40} aria-label={item.label} />
                    <span>{item.label}</span>
                  </div>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatClock(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date());
}

function formatPlace(timeZone: string) {
  const part = timeZone.split("/").pop() ?? timeZone;
  return part.replace(/_/g, " ");
}

function MetaRow() {
  const { person } = useConfig();
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setClock(formatClock(person.location));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [person.location]);

  if (!display.location && !display.time) return null;

  return (
    <div className={styles.metaRow} suppressHydrationWarning>
      <span className={styles.metaPlace}>
        {display.location ? formatPlace(person.location) : ""}
      </span>
      <span className={styles.metaTime}>
        {display.time ? (clock ?? "—") : ""}
      </span>
    </div>
  );
}

export const Header = () => {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeCategory = mounted ? searchParams.get("category") : null;

  const onHome = pathname === "/blogs" || pathname === "/";
  const onBlogPost = pathname.startsWith("/blogs/");
  const onCategories =
    pathname === "/categories" ||
    pathname.startsWith("/category/") ||
    (pathname === "/blogs" && !!activeCategory);
  const onPersonal = pathname.startsWith("/personal");

  const personalDropdownItems = [
    { label: "Blogs", href: "/personal?tab=vlogs", icon: BlogIcon },
    { label: "Videos", href: "/personal?tab=videos", icon: VideoIcon },
  ];

  const navItems = [
    {
      name: "Home",
      href: "/blogs",
      icon: iconLibrary.home,
      selected: onHome && !onBlogPost,
      show: routes["/blogs"],
    },
    {
      name: "Categories",
      href: "/categories",
      icon: iconLibrary.book,
      selected: onCategories && !onBlogPost,
      show: true,
    },
    {
      name: "Personal",
      href: "/personal",
      icon: iconLibrary.person,
      selected: onPersonal,
      show: routes["/personal"],
    },
    {
      name: "Gallery",
      href: "/gallery",
      icon: iconLibrary.gallery,
      selected: pathname.startsWith("/gallery"),
      show: routes["/gallery"],
    },
  ];

  if (!mounted) return null;

  if (isMobile) {
    return (
      <header className={styles.mobilePosition}>
        <nav className={styles.mobileNavItems} aria-label="Mobile navigation">
          {navItems.map((item) => {
            if (!item.show) return null;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames(styles.mobileNavLink, item.selected && styles.mobileNavLinkSelected)}
                aria-current={item.selected ? "page" : undefined}
                title={item.name}
                aria-label={item.name}
              >
                <Icon size={16} />
              </Link>
            );
          })}
          {display.themeSwitcher && <ThemeToggle />}
        </nav>
      </header>
    );
  }

  return (
    <header className={styles.bar}>
      <MetaRow />
      <nav className={styles.navItems} aria-label="Main">
        {routes["/blogs"] && (
          <NavLink href="/blogs" selected={onHome && !onBlogPost}>
            Home
          </NavLink>
        )}

        <NavLink href="/categories" selected={onCategories && !onBlogPost}>
          Categories
        </NavLink>

        {routes["/personal"] && (
          <NavDropdown selected={onPersonal} dropdownItems={personalDropdownItems} isIconDropdown={true}>
            Personal
          </NavDropdown>
        )}

        {routes["/gallery"] && (
          <NavLink href="/gallery" selected={pathname.startsWith("/gallery")}>
            Gallery
          </NavLink>
        )}

        {display.themeSwitcher && (
          <>
            <span className={styles.divider} aria-hidden />
            <ThemeToggle />
          </>
        )}
      </nav>
    </header>
  );
};
