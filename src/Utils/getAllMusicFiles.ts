import { App, TFile, TFolder } from "obsidian";

const MUSIC_FILE_EXTENSIONS = ["mp3"];

const getVaultMusicFiles = (app: App, folderPath: string): TFile[] => {
	const folder = folderPath === "/" ? app.vault.getRoot() : app.vault.getAbstractFileByPath(folderPath);
	
	if (!folder || !(folder instanceof TFolder)) {
		return [];
	}

	const files: TFile[] = [];
	const traverse = (currentFolder: TFolder) => {
		currentFolder.children.forEach((child) => {
			if (child instanceof TFolder) {
				traverse(child);
			} else if (
				child instanceof TFile &&
				MUSIC_FILE_EXTENSIONS.includes(child.extension.toLowerCase())
			) {
				files.push(child);
			}
		});
	};

	traverse(folder);
	return files;
};

export default getVaultMusicFiles;
