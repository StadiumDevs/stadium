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

interface SCProgress {
  currentPosition?: number;
}

interface SCWidget {
  bind(event: string, cb: (data?: SCProgress) => void): void;
  play(): void;
  pause(): void;
  seekTo(milliseconds: number): void;
  setVolume(volume: number): void;
  getCurrentSound(cb: (sound: SCSound | null) => void): void;
  getDuration(cb: (milliseconds: number) => void): void;
}

interface SCNamespace {
  Widget: ((iframe: HTMLIFrameElement) => SCWidget) & {
    Events: { READY: string; PLAY: string; PLAY_PROGRESS: string; FINISH: string };
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
  // Transport: current position + track length (ms) for the seek slider.
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  // Timestamp of the last user seek — suppresses PLAY_PROGRESS snap-back for a
  // brief window so the thumb doesn't fight the user mid-drag.
  const lastSeekRef = useRef(0);

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
          widget.getDuration((ms) => {
            if (!cancelled) setDurationMs(ms || 0);
          });
        };
        widget.bind(window.SC.Widget.Events.READY, () => {
          widget.setVolume(0);
          widget.play();
          refreshTrack();
        });
        // New track: refresh metadata + duration and reset the position thumb.
        widget.bind(window.SC.Widget.Events.PLAY, () => {
          setPositionMs(0);
          refreshTrack();
        });
        // Advance the seek thumb as the track plays (ignored briefly after a seek).
        widget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
          if (cancelled || Date.now() - lastSeekRef.current < 400) return;
          if (data && typeof data.currentPosition === "number") {
            setPositionMs(data.currentPosition);
          }
        });
        // Loop forever: when the profile's tracks run out, restart from the top so
        // the music never stops (it already survives navigation — the iframe lives
        // above the router).
        widget.bind(window.SC.Widget.Events.FINISH, () => {
          if (cancelled) return;
          widget.seekTo(0);
          widget.play();
        });
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
        // Mute by pausing, not by setVolume(0): on mobile (notably iOS) volume is
        // hardware-controlled and setVolume is a no-op, so volume-based muting
        // silently failed there. play()/pause() honor the user's tap on every
        // platform — and the tap is the gesture mobile needs to start audio.
        if (next) {
          widget.pause();
        } else {
          widget.setVolume(100);
          widget.play();
        }
      }
      return next;
    });
  }, []);

  const seek = useCallback((ms: number) => {
    lastSeekRef.current = Date.now();
    setPositionMs(ms);
    widgetRef.current?.seekTo(ms);
  }, []);

  return (
    <SoundCloudAudioContext.Provider
      value={{ muted, toggle, title, genre, artworkUrl, positionMs, durationMs, seek }}
    >
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
