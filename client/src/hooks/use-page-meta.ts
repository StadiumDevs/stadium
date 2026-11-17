import { useEffect } from "react";

// The site-wide defaults from index.html, captured once before any page changes them.
const DEFAULT_TITLE = typeof document !== "undefined" ? document.title : "Stadium";
const descriptionTag = () =>
  typeof document !== "undefined" ? document.querySelector<HTMLMetaElement>('meta[name="description"]') : null;
const DEFAULT_DESCRIPTION = descriptionTag()?.content ?? "";

/**
 * Sets the tab title ("<title> · Stadium") and meta description for the
 * current page, restoring the index.html defaults on unmount. Google renders
 * JS, so this feeds search results; social link previews still use the static
 * tags in index.html. Pass an undefined title while data is loading to keep
 * the defaults.
 */
export function usePageMeta({ title, description }: { title?: string | null; description?: string | null }) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · Stadium`;
    const tag = descriptionTag();
    if (tag && description) tag.content = description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description;
    return () => {
      document.title = DEFAULT_TITLE;
      const t = descriptionTag();
      if (t) t.content = DEFAULT_DESCRIPTION;
    };
  }, [title, description]);
}
