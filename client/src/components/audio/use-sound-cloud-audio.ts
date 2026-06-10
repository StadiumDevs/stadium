import { createContext, useContext } from "react";

// A highlighted track the listener can pick. SoundCloud tracks play through the
// hidden persistent widget (audio only, survive navigation); the YouTube track
// is a video that renders inline in the panel and can go fullscreen.
export type AudioTrack = {
  id: string;
  label: string;
  artist: string;
  // Genre tag shown on the picker row ("" = none).
  genre: string;
  kind: "soundcloud" | "youtube";
  // SoundCloud: the track/set page URL the widget loads.
  // YouTube: the canonical watch URL.
  url: string;
  // Where the discreet artist link points (SoundCloud profile / YouTube).
  link: string;
  // YouTube only: the embed URL rendered in the inline player.
  embedUrl?: string;
};

// The lineup we feature. Order is the picker order; the first is the default.
export const AUDIO_TRACKS: AudioTrack[] = [
  {
    id: "otherside-podcast",
    label: "Other Side Podcast #08",
    artist: "otherside-podcast",
    genre: "",
    kind: "soundcloud",
    url: "https://soundcloud.com/otherside-podcast/pomlouyen-other-side-podcast-08",
    link: "https://soundcloud.com/otherside-podcast",
  },
  {
    id: "elliephunk-yin",
    label: "Yin (set)",
    artist: "elliephunk",
    genre: "HOUSE",
    kind: "soundcloud",
    url: "https://soundcloud.com/elliephunk/sets/yin-1",
    link: "https://soundcloud.com/elliephunk",
  },
  {
    id: "folk-rock",
    label: "Folk Rock",
    artist: "youtube",
    genre: "FOLK ROCK",
    kind: "youtube",
    url: "https://www.youtube.com/watch?v=Qtx7PE-xuM4",
    link: "https://www.youtube.com/watch?v=Qtx7PE-xuM4",
    embedUrl: "https://www.youtube.com/embed/Qtx7PE-xuM4",
  },
];

export type SoundCloudAudioValue = {
  muted: boolean;
  toggle: () => void;
  title: string;
  genre: string;
  artworkUrl: string;
  // Transport: current position + track length (ms) and seek control.
  positionMs: number;
  durationMs: number;
  seek: (ms: number) => void;
  // Multi-track picker.
  tracks: AudioTrack[];
  selectedTrackId: string;
  selectTrack: (id: string) => void;
  activeTrack: AudioTrack;
};

export const SoundCloudAudioContext = createContext<SoundCloudAudioValue>({
  muted: true,
  toggle: () => {},
  title: "",
  genre: "",
  artworkUrl: "",
  positionMs: 0,
  durationMs: 0,
  seek: () => {},
  tracks: AUDIO_TRACKS,
  selectedTrackId: AUDIO_TRACKS[0].id,
  selectTrack: () => {},
  activeTrack: AUDIO_TRACKS[0],
});

export function useSoundCloudAudio() {
  return useContext(SoundCloudAudioContext);
}
