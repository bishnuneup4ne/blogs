const ALLOWED = new Set(["A", "STRONG", "EM", "B", "I", "U", "S", "STRIKE", "MARK", "SUB", "SUP", "SMALL", "KBD", "CODE", "BR"]);
const ALLOWED_ATTR = new Set(["href", "style"]);
const SAFE_STYLE_PROPS = new Set(["color", "background-color", "text-decoration-line", "text-decoration-color", "text-decoration-thickness", "text-underline-offset"]);

function safeStyle(value: string): string {
  return value
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => {
      const colon = d.indexOf(":");
      return colon > 0 && SAFE_STYLE_PROPS.has(d.slice(0, colon).trim().toLowerCase());
    })
    .filter((d) => !/[<>{}"']/.test(d) && !/url|expression/i.test(d))
    .join("; ");
}

/**
 * Minimal allow-list sanitizer for inline post HTML. Editor input is untrusted
 * (it is persisted and re-rendered), so only the tags the content model uses
 * survive; everything else is unwrapped and all attributes are dropped except
 * safe hrefs on anchors.
 */
export function sanitizeInlineHtml(input: string): string {
  if (typeof window === "undefined") return input;
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }
      const el = child as Element;
      if (!ALLOWED.has(el.tagName)) {
        walk(el);
        while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
        el.remove();
        return;
      }
      Array.from(el.attributes).forEach((attr) => {
        if (!ALLOWED_ATTR.has(attr.name)) el.removeAttribute(attr.name);
        else if (attr.name === "style") {
          const kept = safeStyle(attr.value);
          if (kept) el.setAttribute("style", kept);
          else el.removeAttribute("style");
        }
      });
      if (el.tagName === "A") {
        const href = el.getAttribute("href") ?? "";
        if (!/^(https?:\/\/|\/|#|mailto:)/i.test(href)) el.removeAttribute("href");
        el.setAttribute("rel", "noreferrer noopener");
      }
      walk(el);
    });
  };

  walk(root);
  return root.innerHTML;
}
