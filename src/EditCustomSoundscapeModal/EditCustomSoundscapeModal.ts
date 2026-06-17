import { Modal, Setting, TFolder } from "obsidian";
import SoundscapesPlugin from "../../main";
import { CustomSoundscape } from "src/Types/Interfaces";
import { FolderSuggest } from "src/Utils/FolderSuggest";

class EditCustomSoundscapeModal extends Modal {
	_customSoundscape: CustomSoundscape;
	_onSave: Function;

	constructor(
		plugin: SoundscapesPlugin,
		customSoundscape: CustomSoundscape,
		onSave: Function
	) {
		super(plugin.app);
		this._customSoundscape = customSoundscape;
		this._onSave = onSave;
	}

	onOpen() {
		this.display();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	display(): void {
		const { contentEl } = this;

		contentEl.empty();

		contentEl.createEl("h2", { text: "Edit custom soundscape" });

		new Setting(contentEl)
			.setName("Soundscape name")
			.setDesc(`What would you like to call the soundscape?`)
			.addText((component) => {
				component.setValue(this._customSoundscape.name);

				if (component.getValue().trim() === "") {
					component.inputEl.addClass("soundscapes-validation-error");
				} else {
					component.inputEl.removeClass(
						"soundscapes-validation-error"
					);
				}

				component.onChange((value: string) => {
					this._customSoundscape.name = value;
				});

				component.inputEl.addEventListener("blur", () => {
					this.display();
				});
			});

		new Setting(contentEl)
			.setName("Folder")
			.setDesc(`Which folder contains the MP3 files for this soundscape?`)
			.addText((component) => {
				component.setValue(this._customSoundscape.folder);
				new FolderSuggest(this.app, component.inputEl);
				component.onChange((value: string) => {
					this._customSoundscape.folder = value;
					this.display();
				});
			});

		new Setting(contentEl).addButton((component) => {
			component.setButtonText("Save custom soundscape");

			if (
				this._customSoundscape.name.trim() === "" ||
				this._customSoundscape.folder.trim() === ""
			) {
				component.setDisabled(true);
				component.setClass("soundscapes-button-disabled");
			} else {
				component.setCta().onClick(() => {
					this._onSave(this._customSoundscape);
					this.close();
				});
			}
		});
	}
}

export default EditCustomSoundscapeModal;
