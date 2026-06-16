import { PLAYER_STATE, SOUNDSCAPE_TYPE } from "./Enums";

export interface CustomSoundscape {
	id: string;
	name: string;
	folder: string;
}

export interface Soundscape {
	id: string;
	name: string;
	nowPlayingText: string;
	type: SOUNDSCAPE_TYPE;
}

export interface LocalMusicFile {
	fileName: string;
	fullPath: string;
	title: string | undefined | null;
	artist: string | undefined | null;
	album: string | undefined | null;
	duration: number | undefined | null;
}

export interface LocalPlayerState {
	currentTrack?: LocalMusicFile | undefined;
	playerState?: PLAYER_STATE | undefined;
	currentTime?: number | undefined;
}
