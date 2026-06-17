# Implementation Plan: Custom Playlist Fixes & Features

## Goal Description
Resolve the issue with the first song playing 3 times when changing playlists, implement a true random playback system with a 10-song memory to prevent repeats, and replace the folder selection dropdown with a typed input featuring autocomplete suggestions.

## Phases of Execution

### Phase 1: Bug Fix - Duplicate Playback
- **File**: `main.ts`
- **Action**: Fix `populateChangeSoundscapeButton` by using `onchange` instead of `addEventListener` for the `changeSoundscapeSelect` element.
- **Purpose**: Prevent duplicate listener accumulation that causes the song to fire multiple times on playlist switch.

### Phase 2: Refactoring - True Randomness
- **Files**: `main.ts`, `src/Utils/createShuffleQueue.ts`
- **Action**: 
  - Delete `createShuffleQueue.ts`.
  - In `main.ts`, introduce a `recentTracks` array to store playback history.
  - Rewrite `next()` to generate a true random index from the playlist that does not exist in the last 10 elements of `recentTracks`.
  - Rewrite `previous()` to step backwards through the `recentTracks` array.
- **Purpose**: Deliver non-repeating true randomness over a 10-song window and maintain a logical history structure.

### Phase 3: UX Improvement - Typed Folder Selection
- **Files**: `src/Utils/FolderSuggest.ts`, `src/Settings/Settings.ts`, `src/EditCustomSoundscapeModal/EditCustomSoundscapeModal.ts`
- **Action**:
  - Create `FolderSuggest.ts` extending `AbstractInputSuggest<TFolder>` to hook into Obsidian's native suggestive text prompts.
  - In `Settings.ts` and `EditCustomSoundscapeModal.ts`, replace the `addDropdown` folder selectors with `addText` fields and apply `FolderSuggest`.
- **Purpose**: Replace the clunky and unscalable folder dropdown with a robust text input auto-completion tool.

## Architectural Notes for Maintenance
- Moving from a static shuffle queue to an active history array simplifies track navigation and supports more intuitive "previous" track behavior.
- Using Obsidian's `AbstractInputSuggest` standardizes the UI for folder selection across the plugin, creating a single reusable component (`FolderSuggest`) instead of repeatedly pulling `.getAllLoadedFiles()`.
