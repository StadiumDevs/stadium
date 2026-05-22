import { useCallback, useEffect, useRef, useState } from "react";
import { SoundCloudAudioContext } from "./use-sound-cloud-audio";

// --- SoundCloud Widget API integration ---
// The audio lives in a provider mounted ABOVE the router so the hidden iframe
// (and its playback) survives page navigation — the brightness-rack only
// renders the controls + now-playing card and reads state from this context.

interface SCSound {
  title?: string | null;
  genre?: string | null;
  artwork_url?: string | null;
  user?: { username?: string | null; avatar_url?: string | null } | null;
}

interface SCWidget {
  bind(event: string, cb: () => void): void;
  play(): void;
  pause(): void;
  setVolume(volume: number): void;
  getCurrentSound(cb: (sound: SCSound | null) => void): void;
}

interface SCNamespace {
  Widget: ((iframe: HTMLIFrameElement) => SCWidget) & {
    Events: { READY: string; PLAY: string };
  };
}

declare global {
  interface Window {
    SC?: SCNamespace;
  }
}

const SC_WIDGET_SCRIPT = "https://w.soundcloud.com/player/api.js";
const SC_PROFILE_URL = "https://soundcloud.com/pommeshdrms";
const SC_IFRAME_SRC =
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(SC_PROFILE_URL)}` +
  "&auto_play=false&hide_related=true&show_comments=false&show_user=false" +
  "&show_reposts=false&show_teaser=false&visual=false&buying=false" +
  "&sharing=false&download=false&show_artwork=false";

// SoundCloud serves small artwork by default; bump to a crisper 200px square.
const upscaleArtwork = (url: string) =>
  url.replace(/-(large|t\d+x\d+)\.(jpg|png)/i, "-t200x200.$2");

let scScriptPromise: Promise<void> | null = null;
function loadSoundCloudWidget(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.SC) return Promise.resolve();
  if (scScriptPromise) return scScriptPromise;
  scScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SC_WIDGET_SCRIPT}"]`,
    );
    if (existing) {
      if (window.SC) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("SC script failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SC_WIDGET_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("SC script failed"));
    document.head.appendChild(script);
  });
  return scScriptPromise;
}

/**
 * Mount once, above the router. Owns the hidden SoundCloud iframe + widget so
 * playback persists across page navigation. Muted-by-default autoplay; exposes
 * the current track's title / genre / artwork via useSoundCloudAudio().
 */
export function SoundCloudAudioProvider({ children }: { children: React.ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<SCWidget | null>(null);
  const [muted, setMuted] = useState(true);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [artworkUrl, setArtworkUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadSoundCloudWidget()
      .then(() => {
        if (cancelled || !iframeRef.current || !window.SC) return;
        const widget = window.SC.Widget(iframeRef.current);
        widgetRef.current = widget;
        const refreshTrack = () => {
          widget.getCurrentSound((sound) => {
            if (cancelled || !sound) return;
            setTitle(sound.title ?? "");
            setGenre(sound.genre ?? "");
            const art = sound.artwork_url || sound.user?.avatar_url || "";
            setArtworkUrl(art ? upscaleArtwork(art) : "");
          });
        };
        widget.bind(window.SC.Widget.Events.READY, () => {
          widget.setVolume(0);
          widget.play();
          refreshTrack();
        });
        widget.bind(window.SC.Widget.Events.PLAY, refreshTrack);
      })
      .catch(() => {
        // Network-blocked or offline — leave audio inert; UI still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      const widget = widgetRef.current;
      if (widget) {
        widget.setVolume(next ? 0 : 100);
        widget.play();
      }
      return next;
    });
  }, []);

  return (
    <SoundCloudAudioContext.Provider value={{ muted, toggle, title, genre, artworkUrl }}>
      {children}
      {/* Hidden, persistent across navigation: 1×1, transparent, no pointer events. */}
      <iframe
        ref={iframeRef}
        src={SC_IFRAME_SRC}
        title="SoundCloud audio player (pommeshdrms)"
        aria-hidden="true"
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        className="absolute pointer-events-none opacity-0 w-px h-px overflow-hidden"
      />
    </SoundCloudAudioContext.Provider>
  );
}
