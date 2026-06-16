# Local Playlist Overhaul Implementation Plan

## Objective
Completely remove the YouTube feature from the Obsidian Soundscapes (Minstrel) plugin and transform "Custom Soundscapes" into local folder-based playlists. The new playlists will use the native Obsidian API to pick a folder inside the vault, index all `.mp3` files in it, and play them using the local audio player efficiently.

## Recommendations for Maintenance
1. **Deprecate/Merge "My Music"**: Since "Custom Soundscapes" will now essentially be local playlists, they serve the exact same purpose as the "My Music" feature. We can just treat "My Music" as one of the Custom Soundscapes or remove it entirely to avoid maintaining two separate ways of playing local files.
2. **Memory Efficiency (`app.vault.getResourcePath`)**: The current implementation of local music reads the entire `.mp3` file into a base64 string. This can cause severe memory issues for large playlists. We should use Obsidian's `app.vault.getResourcePath(TFile)` to stream the audio directly from the file system.

> [!IMPORTANT] User Review Required
> 1. Should we completely remove the "My Music" setting since "Custom Soundscapes" will now do the exact same thing (but allow you to make multiple)?
> 2. Do you want to keep the "My Music" absolute OS path feature for files outside the Vault, or migrate everything to be strictly inside the Obsidian Vault?

---

## Phase 1: Update Interfaces and Remove YouTube Types
- [ ] **`src/Types/Interfaces.ts`**:
  - Refactor `CustomSoundscape` to remove `tracks`. Add `folder: string` (to store the Vault path).
  - Remove `youtubeId` and `isLiveVideo` from `Soundscape` interface.
  - Remove the `Player` interface used for the YouTube iframe.
  - Update `LocalMusicFile` to contain Vault-friendly fields (e.g., storing a `TFile` path instead of an absolute OS path).
- [ ] **`src/Types/Enums.ts`**:
  - Remove `SOUNDSCAPE_TYPE.STANDARD` since default YouTube soundscapes are being removed.
- [ ] **`src/Soundscapes.ts`**:
  - Delete or empty the default YouTube soundscapes list.

## Phase 2: Refactor Indexing & Remove fs/path dependencies
- [ ] **`src/Utils/getAllMusicFiles.ts`**:
  - Rewrite this function (or create a new one like `getVaultMusicFiles.ts`) to accept an Obsidian `TFolder` path instead of an absolute OS path.
  - Use `app.vault.getFiles()` and filter by the selected folder path and `mp3` extension.
- [ ] **`main.ts` (Music Indexing)**:
  - Create a method `indexCustomSoundscape(folderPath: string)` that uses `app.vault.readBinary()` combined with `music-metadata` (`parseBuffer`) to extract ID3 tags natively inside Obsidian.

## Phase 3: Update React Settings & Modals
- [ ] **`src/EditCustomSoundscapeModal/EditCustomSoundscapeModal.ts`**:
  - Remove the UI for adding individual YouTube tracks.
  - Change the input to a folder dropdown selector. Use `app.vault.getAllLoadedFiles()` to list all `TFolder` objects and present them in a dropdown.
- [ ] **`src/Settings/Settings.ts`**:
  - Update setting descriptions to remove all mentions of YouTube.
  - Clean up setting UI for anything related to the old YouTube implementation.

## Phase 4: Overhaul `main.ts` Player Logic
- [ ] **Remove YouTube API**:
  - Delete `createPlayer` iframe script injection.
  - Remove all `this.player` (YT.Player) references.
  - Delete YouTube specific styles in `styles.scss` (like `soundscapesroot--hideyoutube`).
- [ ] **Update Local Player for Custom Soundscapes**:
  - Modify `onSoundscapeChange()` so that when a Custom Soundscape is selected, it sets `this.localPlayer.src` to the `app://` protocol resource URL using `app.vault.getResourcePath(tfile)`. This prevents loading massive base64 strings into memory.
  - Update `play()`, `pause()`, `next()`, `previous()` to control `this.localPlayer` directly for Custom Soundscapes.

## Phase 5: Clean Up and QA
- [ ] Remove unused dependencies if any.
- [ ] Thoroughly test switching between different folder playlists.
- [ ] Verify shuffle and loop functionality with the newly structured local tracks.
