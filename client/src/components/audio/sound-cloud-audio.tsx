import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { AUDIO_TRACKS, SoundCloudAudioContext } from "./use-sound-cloud-audio";

// --- SoundCloud Widget API integration ---
// The audio lives in a provider mounted ABOVE the router so the hidden iframe
// (and its playback) survives page navigation — the brightness-rack only
// renders the controls + now-playing card and reads state from this context.
//
// We feature a small lineup (see AUDIO_TRACKS). The SoundCloud tracks all play
// through this one hidden widget via widget.load(); the YouTube track is a
// video the panel renders inline, so selecting it just pauses the widget.

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
  load(url: string, options?: { auto_play?: boolean; callback?: () => void }): void;
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
// The widget boots on the first SoundCloud track; selecting another swaps it in
// via widget.load().
const FIRST_SC_URL =
  AUDIO_TRACKS.find((t) => t.kind === "soundcloud")?.url ?? AUDIO_TRACKS[0].url;
const SC_IFRAME_SRC =
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(FIRST_SC_URL)}` +
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
 * the featured track lineup, the current selection, and the current SoundCloud
 * track's title / genre / artwork / transport via useSoundCloudAudio().
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
  const [selectedTrackId, setSelectedTrackId] = useState(AUDIO_TRACKS[0].id);
  // Timestamp of the last user seek — suppresses PLAY_PROGRESS snap-back for a
  // brief window so the thumb doesn't fight the user mid-drag.
  const lastSeekRef = useRef(0);
  // Which SoundCloud URL the widget currently holds — lets us resume (rather
  // than reload from 0) when returning to the same track after the YouTube one.
  const loadedScUrlRef = useRef(FIRST_SC_URL);
  // Current mute state for use inside widget callbacks without re-binding.
  const mutedRef = useRef(true);
  mutedRef.current = muted;
  // Wraps the persistent YouTube mini-player so its FULLSCREEN button can
  // request it. The player lives here (above the router) so the video keeps
  // playing across page navigation.
  const ytWrapRef = useRef<HTMLDivElement | null>(null);

  const activeTrack = useMemo(
    () => AUDIO_TRACKS.find((t) => t.id === selectedTrackId) ?? AUDIO_TRACKS[0],
    [selectedTrackId],
  );

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
        // New track (incl. after widget.load): refresh metadata + duration and
        // reset the position thumb.
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
        // Loop forever: when the track ends, restart from the top so the music
        // never stops (it already survives navigation — the iframe lives above
        // the router).
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

  // Pick a track. Picking is an explicit "I want to listen" gesture, so the
  // chosen source starts audibly. SoundCloud tracks swap into the hidden widget;
  // the YouTube track is rendered inline by the panel, so here we just pause the
  // widget and let the embed take over.
  const selectTrack = useCallback((id: string) => {
    const track = AUDIO_TRACKS.find((t) => t.id === id);
    if (!track) return;
    setSelectedTrackId(id);
    const widget = widgetRef.current;
    if (track.kind === "youtube") {
      widget?.pause();
      return;
    }
    setMuted(false);
    if (!widget) return;
    if (loadedScUrlRef.current === track.url) {
      widget.setVolume(100);
      widget.play();
      return;
    }
    loadedScUrlRef.current = track.url;
    widget.load(track.url, {
      auto_play: true,
      callback: () => widget.setVolume(100),
    });
  }, []);

  return (
    <SoundCloudAudioContext.Provider
      value={{
        muted,
        toggle,
        title,
        genre,
        artworkUrl,
        positionMs,
        durationMs,
        seek,
        tracks: AUDIO_TRACKS,
        selectedTrackId,
        selectTrack,
        activeTrack,
      }}
    >
      {children}
      {/* Hidden, persistent across navigation: 1×1, transparent, no pointer events. */}
      <iframe
        ref={iframeRef}
        src={SC_IFRAME_SRC}
        title="SoundCloud audio player"
        aria-hidden="true"
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        className="absolute pointer-events-none opacity-0 w-px h-px overflow-hidden"
      />
      {/* Persistent YouTube mini-player. Mounted here (above the router) so the
          video keeps playing across navigation. Small + responsive so it fits a
          phone screen; closes back to the music. */}
      {activeTrack.kind === "youtube" && (
        <div className="fixed bottom-3 left-3 z-50 w-[min(60vw,200px)] border border-hairline bg-panel-deep shadow-lg">
          <div className="flex items-center gap-1 px-2 py-1 border-b border-hairline-subtle">
            <span className="font-mono text-[10px] text-display truncate">{activeTrack.label}</span>
            <span className="ml-auto flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => ytWrapRef.current?.requestFullscreen?.()}
                aria-label="Fullscreen video"
                title="Fullscreen"
                className="lcd p-1 hover:bg-panel transition-colors duration-150 group"
              >
                <Maximize2 className="h-3 w-3 text-label-mid group-hover:text-display" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => selectTrack(AUDIO_TRACKS[0].id)}
                aria-label="Close video and play music"
                title="Close"
                className="lcd p-1 hover:bg-panel transition-colors duration-150 group"
              >
                <X className="h-3 w-3 text-label-mid group-hover:text-display" aria-hidden="true" />
              </button>
            </span>
          </div>
          <div ref={ytWrapRef} className="relative w-full aspect-video bg-black">
            <iframe
              key={activeTrack.id}
              src={`${activeTrack.embedUrl}?autoplay=1&rel=0&playsinline=1`}
              title={`${activeTrack.label} (${activeTrack.artist})`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </SoundCloudAudioContext.Provider>
  );
}
