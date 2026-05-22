import { createContext, useContext } from "react";

export type SoundCloudAudioValue = {
  muted: boolean;
  toggle: () => void;
  title: string;
  genre: string;
  artworkUrl: string;
};

export const SoundCloudAudioContext = createContext<SoundCloudAudioValue>({
  muted: true,
  toggle: () => {},
  title: "",
  genre: "",
  artworkUrl: "",
});

export function useSoundCloudAudio() {
  return useContext(SoundCloudAudioContext);
}
