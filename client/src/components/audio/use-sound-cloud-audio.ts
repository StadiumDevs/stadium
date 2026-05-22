import { createContext, useContext } from "react";

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
});

export function useSoundCloudAudio() {
  return useContext(SoundCloudAudioContext);
}
