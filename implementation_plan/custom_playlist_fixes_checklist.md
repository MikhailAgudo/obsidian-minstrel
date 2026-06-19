# Custom Playlist Fixes — Implementation Checklist

This checklist tracks all work needed to fix bugs and add features described in `custom_playlist_fixes.md`.
It is written so that any model (including weaker ones) can pick up a phase and execute it without needing to re-read the whole codebase.

---

## Context / Architecture Summary

| File | Role |
|------|------|
| `main.ts` | Plugin entry point and main class `SoundscapesPlugin`. Owns the `HTMLAudioElement` (`localPlayer`), playback logic (`play`, `pause`, `next`, `previous`), shuffle state (`recentTracks[]`, `historyPosition`), and the `onSoundscapeChange()` method that loads a track. |
| `src/Types/Interfaces.ts` | TypeScript interfaces: `CustomSoundscape`, `LocalMusicFile`, `LocalPlayerState`. |
| `src/Types/Enums.ts` | Enums: `SOUNDSCAPE_TYPE`, `PLAYER_STATE`. |
| `src/Settings/Settings.ts` | `SoundscapesPluginSettings` interface + defaults + `SoundscapesSettingsTab`. |
| `src/Utils/FolderSuggest.ts` | Obsidian `AbstractInputSuggest` implementation — already wired to every folder text input. |
| `src/Utils/getAllMusicFiles.ts` | Utility that returns all audio `TFile[]` inside a vault folder path. |
| `src/EditCustomSoundscapeModal/EditCustomSoundscapeModal.ts` | Modal for creating/editing a custom soundscape (name + folder). Already uses `FolderSuggest`. |
| `React/Components/Header/Header.tsx` | React header for the My Music view — controls, seek bar, shuffle toggle. |
| `React/Components/Search/Search.tsx` | Search box component inside the My Music view. |

---

## Open / Known Issues

- **Triple-play bug** ✅ Already fixed in a prior session (`changeSoundscape` resets `recentTracks` and `historyPosition`). Confirmed checked in `custom_playlist_fixes.md`.
- **True random / 10-song no-repeat window** ✅ Already fixed in a prior session (see `next()` in `main.ts`). Confirmed checked.
- **Folder input → suggestion input** ✅ Already implemented via `FolderSuggest` on every text field. Confirmed checked.
- **Static / memory leak on long sessions** ❌ Not yet fixed. (Phase 1)
- **First shuffle on playlist load** ❌ Not yet implemented. (Phase 2)

---

## Phase 1 — Fix Audio Memory Leak / Static on Long Sessions

**Goal:** Prevent static and audio glitches that accumulate over long Obsidian sessions.

**Root cause analysis:**  
The `HTMLAudioElement` (`this.localPlayer`) is created once in `createPlayer()` and reused for the entire Obsidian session. Every time `onSoundscapeChange()` is called it calls `this.localPlayer.pause()` and sets a new `src`. However, the old audio buffer is never explicitly released. Over many track changes, unreleased blob URLs or audio buffers can accumulate in Chromium's memory. The fix is to properly revoke and release resources when switching tracks.

**Files to change:**

### 1.1 — `main.ts` → `onSoundscapeChange()` (lines ~741–783)

**What to do:**  
Before setting a new `src`, revoke any existing object URL and clear the `src` completely to trigger garbage collection of the old audio buffer.

**Exact change:**

Find this block inside `onSoundscapeChange()`:
```typescript
this.localPlayer.pause();
if (tfile && tfile instanceof TFile) {
    this.localPlayer.src = this.app.vault.getResourcePath(tfile);
} else {
    this.localPlayer.src = "";
}
```

Replace with:
```typescript
this.localPlayer.pause();
// Explicitly release the previous audio buffer to prevent memory accumulation
// over long sessions (which causes static/glitches).
this.localPlayer.src = "";
this.localPlayer.load(); // Forces the browser to release the previous buffer

if (tfile && tfile instanceof TFile) {
    this.localPlayer.src = this.app.vault.getResourcePath(tfile);
}
```

**Why `load()` matters:** Calling `.load()` after clearing `src` forces Chromium to abort any pending network request and discard the decoded audio buffer for the previous track. Without it, the old buffer stays in memory.

### 1.2 — `main.ts` → `onunload()` (lines ~142–147)

**What to do:**  
When the plugin unloads, explicitly destroy the audio element to release all held resources.

Find:
```typescript
onunload() {
    // Clear any timers if they exist
    if (this.reindexTimer) {
        clearTimeout(this.reindexTimer);
    }
}
```

Replace with:
```typescript
onunload() {
    // Clear any timers if they exist
    if (this.reindexTimer) {
        clearTimeout(this.reindexTimer);
    }

    // Explicitly destroy the audio element to release all audio buffers
    // and prevent memory leaks after the plugin is disabled/reloaded.
    if (this.localPlayer) {
        this.localPlayer.pause();
        this.localPlayer.src = "";
        this.localPlayer.load();
    }
}
```

### Phase 1 Checklist

- [x] **1.1** Edit `onSoundscapeChange()` in `main.ts`: add `this.localPlayer.src = ""; this.localPlayer.load();` before setting the new src.
- [x] **1.2** Edit `onunload()` in `main.ts`: add audio element teardown.
- [x] **Verify:** Rebuild (`npm run build`) — **zero TypeScript errors. Build succeeded.**

---

## Phase 2 — Shuffle the First Song on Playlist Load

**Goal:** When a custom playlist (or My Music) first loads, the first song that plays should be random — not always index 0.

**Root cause analysis:**  
In `changeSoundscape()` (`main.ts` lines ~628–653), when switching to a custom soundscape, `this.currentTrackIndex` is hard-coded to `0` before calling `onSoundscapeChange()`. This means the first song always plays. The fix is: after loading the index, if shuffle is enabled, pick a random starting track (respecting the 10-song no-repeat window).

**Files to change:**

### 2.1 — `main.ts` → `changeSoundscape()` (lines ~628–653)

**What to do:**  
After the `songs` index is built (for both custom playlists and My Music), if `myMusicShuffle` is `true`, call the same randomization logic used in `next()` to pick the starting index instead of always using `0`.

Find the block that handles the custom soundscape:
```typescript
if (this.settings.soundscape.startsWith(`${SOUNDSCAPE_TYPE.CUSTOM}_`)) {
    this.currentTrackIndex = 0;
    const customSoundscape = this.getCurrentCustomSoundscape();
    if (customSoundscape && customSoundscape.folder) {
        const songs = await this.indexCustomSoundscape(
            customSoundscape.folder
        );
        this.settings.myMusicIndex = songs;
    }
}
```

Replace with:
```typescript
if (this.settings.soundscape.startsWith(`${SOUNDSCAPE_TYPE.CUSTOM}_`)) {
    const customSoundscape = this.getCurrentCustomSoundscape();
    if (customSoundscape && customSoundscape.folder) {
        const songs = await this.indexCustomSoundscape(
            customSoundscape.folder
        );
        this.settings.myMusicIndex = songs;
    }
    // Pick a random starting track if shuffle is on, otherwise start at 0
    this.currentTrackIndex = this.settings.myMusicShuffle
        ? this.pickRandomTrackIndex()
        : 0;
}
```

Also find the My Music block:
```typescript
if (this.settings.soundscape === SOUNDSCAPE_TYPE.MY_MUSIC) {
    await this.indexMusicLibrary();
    this.ribbonButton.show();
} else {
    this.ribbonButton.hide();
}
```

Add the random starting index after `indexMusicLibrary()`:
```typescript
if (this.settings.soundscape === SOUNDSCAPE_TYPE.MY_MUSIC) {
    await this.indexMusicLibrary();
    this.ribbonButton.show();
    // Pick a random starting track if shuffle is on
    this.currentTrackIndex = this.settings.myMusicShuffle
        ? this.pickRandomTrackIndex()
        : 0;
} else {
    this.ribbonButton.hide();
}
```

### 2.2 — `main.ts` → Add `pickRandomTrackIndex()` helper method

**What to do:**  
Extract the random-track logic from `next()` into a reusable private method. This avoids code duplication (DRY principle) and makes the logic easy to find and modify.

Add this method to the `SoundscapesPlugin` class (place it near `next()` and `previous()` for discoverability, around line ~575):

```typescript
/**
 * Picks a random track index that has not been played in the last 10 songs.
 * Returns 0 if the index is empty.
 */
pickRandomTrackIndex(): number {
    const totalSongs = this.settings.myMusicIndex.length;
    if (totalSongs === 0) return 0;

    const recentLimit = Math.min(10, totalSongs - 1);
    const recentSet = new Set(this.recentTracks.slice(-recentLimit));

    let newIndex = Math.floor(Math.random() * totalSongs);
    let attempts = 0;
    while (recentSet.has(newIndex) && attempts < 50) {
        newIndex = Math.floor(Math.random() * totalSongs);
        attempts++;
    }

    this.recentTracks.push(newIndex);
    if (this.recentTracks.length > 50) {
        this.recentTracks.shift();
    }
    this.historyPosition = this.recentTracks.length - 1;

    return newIndex;
}
```

### 2.3 — `main.ts` → Refactor `next()` to use `pickRandomTrackIndex()`

**What to do:**  
Now that the helper exists, simplify the shuffle branch inside `next()` to call `pickRandomTrackIndex()` instead of duplicating the logic.

Find the shuffle branch in `next()`:
```typescript
} else {
    // Generate a true random song
    const totalSongs = this.settings.myMusicIndex.length;
    if (totalSongs > 0) {
        // We don't want to repeat a song within the last 10 songs (or totalSongs - 1 if smaller)
        const recentLimit = Math.min(10, totalSongs - 1);
        const recentSet = new Set(this.recentTracks.slice(-recentLimit));
        
        let newIndex = Math.floor(Math.random() * totalSongs);
        // Fallback counter to prevent infinite loops in weird edge cases
        let attempts = 0;
        while (recentSet.has(newIndex) && attempts < 50) {
            newIndex = Math.floor(Math.random() * totalSongs);
            attempts++;
        }

        this.currentTrackIndex = newIndex;
        this.recentTracks.push(newIndex);
        
        // Limit history size to prevent memory leaks over long sessions
        if (this.recentTracks.length > 50) {
            this.recentTracks.shift();
        }
        this.historyPosition = this.recentTracks.length - 1;
    }
}
```

Replace with:
```typescript
} else {
    // Generate a true random song using the shared helper
    if (this.settings.myMusicIndex.length > 0) {
        this.currentTrackIndex = this.pickRandomTrackIndex();
    }
}
```

### Phase 2 Checklist

- [x] **2.1** Add `pickRandomTrackIndex()` helper method to the plugin class in `main.ts`.
- [x] **2.2** Refactor `next()` shuffle branch to call `pickRandomTrackIndex()`.
- [x] **2.3** Update `changeSoundscape()` custom playlist branch: remove hardcoded `currentTrackIndex = 0`, use `pickRandomTrackIndex()` when shuffle is on.
- [x] **2.4** Update `changeSoundscape()` My Music branch: after `indexMusicLibrary()`, use `pickRandomTrackIndex()` when shuffle is on.
- [x] **Verify:** Rebuild — **zero TypeScript errors. Build succeeded.**

---

## Phase 3 — Build & Final Validation

**Goal:** Confirm all changes compile cleanly and work end-to-end.

### Phase 3 Checklist

- [x] **3.1** Run `npm run build` — **zero TypeScript errors. Build succeeded.**
- [ ] **3.2** Copy built `main.js` to vault's `.obsidian/plugins/` folder and reload the plugin.
- [ ] **3.3** Test Phase 1: Play ~20+ songs rapidly. Confirm no static/glitches.
- [ ] **3.4** Test Phase 2: Switch to a custom playlist with shuffle on. Confirm the first song varies across multiple switches.
- [ ] **3.5** Confirm previous/next still work correctly in both shuffle and non-shuffle modes.
- [ ] **3.6** Update `custom_playlist_fixes.md` to mark remaining items `[x]`.

---

## What Was Already Done (Do Not Redo)

The following items from `custom_playlist_fixes.md` were completed in a prior session and are **already in the codebase**:

- ✅ Triple-play bug when switching playlists — fixed in `changeSoundscape()` by resetting `recentTracks` and `historyPosition`.
- ✅ True random playback with 10-song no-repeat window — implemented in `next()`.
- ✅ Folder selection is now a typed-input with suggestions — `FolderSuggest` is already attached to all folder text inputs in both `EditCustomSoundscapeModal.ts` and `Settings.ts`.

---

## Notes for Future Maintenance

- **`pickRandomTrackIndex()`** is the single source of truth for "pick a non-recently-played random song." Any future change to the randomization strategy (e.g., changing the no-repeat window from 10 to 20) only needs to happen in one place.
- **`recentTracks[]`** is capped at 50 entries to prevent unbounded memory growth over long sessions.
- **`this.localPlayer.load()`** must always be called after clearing `src` when switching tracks. Do not skip this — it is the key step that releases the old audio buffer.
- The **`FolderSuggest`** class in `src/Utils/FolderSuggest.ts` uses Obsidian's `AbstractInputSuggest` API. It does not need to be changed; just wire it to any new text inputs that ask for folder paths.
