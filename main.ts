// import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// // Remember to rename these classes and interfaces!

// interface MyPluginSettings {
// 	mySetting: string;
// }

// const DEFAULT_SETTINGS: MyPluginSettings = {
// 	mySetting: 'default'
// }

// export default class MyPlugin extends Plugin {
// 	settings: MyPluginSettings;

// 	async onload() {
// 		await this.loadSettings();

// 		// This creates an icon in the left ribbon.
// 		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
// 			// Called when the user clicks the icon.
// 			new Notice('This is a notice!');
// 		});
// 		// Perform additional things with the ribbon
// 		ribbonIconEl.addClass('my-plugin-ribbon-class');

// 		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
// 		const statusBarItemEl = this.addStatusBarItem();
// 		statusBarItemEl.setText('Status Bar Text');

// 		// This adds a simple command that can be triggered anywhere
// 		this.addCommand({
// 			id: 'open-sample-modal-simple',
// 			name: 'Open sample modal (simple)',
// 			callback: () => {
// 				new SampleModal(this.app).open();
// 			}
// 		});
// 		// This adds an editor command that can perform some operation on the current editor instance
// 		this.addCommand({
// 			id: 'sample-editor-command',
// 			name: 'Sample editor command',
// 			editorCallback: (editor: Editor, view: MarkdownView) => {
// 				console.log(editor.getSelection());
// 				editor.replaceSelection('Sample Editor Command');
// 			}
// 		});
// 		// This adds a complex command that can check whether the current state of the app allows execution of the command
// 		this.addCommand({
// 			id: 'open-sample-modal-complex',
// 			name: 'Open sample modal (complex)',
// 			checkCallback: (checking: boolean) => {
// 				// Conditions to check
// 				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
// 				if (markdownView) {
// 					// If checking is true, we're simply "checking" if the command can be run.
// 					// If checking is false, then we want to actually perform the operation.
// 					if (!checking) {
// 						new SampleModal(this.app).open();
// 					}

// 					// This command will only show up in Command Palette when the check function returns true
// 					return true;
// 				}
// 			}
// 		});

// 		// This adds a settings tab so the user can configure various aspects of the plugin
// 		this.addSettingTab(new SampleSettingTab(this.app, this));

// 		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
// 		// Using this function will automatically remove the event listener when this plugin is disabled.
// 		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
// 			console.log('click', evt);
// 		});

// 		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
// 		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
// 	}

// 	onunload() {

// 	}

// 	async loadSettings() {
// 		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
// 	}

// 	async saveSettings() {
// 		await this.saveData(this.settings);
// 	}
// }

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: MyPlugin;

// 	constructor(app: App, plugin: MyPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }

import { Plugin, TFile, Editor, MarkdownView, Notice } from "obsidian";
import { getFormattedTimestamp } from "./utils";

export default class AudioInserterPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "record-and-insert-audio",
			name: "Record and Insert Audio (Top/Bottom)",
			callback: () => this.handleAudioInsert("bottom"), // Change to "top" if needed
		});
	}

	async handleAudioInsert(position: "top" | "bottom") {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (!view) {
			new Notice("No active markdown file open.");
			return;
		}

		const file = view.file;
		if (!file) return;

		const editor = view.editor;
		const wasReading = view.getMode() === "preview";

		// Switch to edit mode
		// if (wasReading) view.setMode("source");
		if (wasReading) view.currentMode.set("source", true);

		// Simulate audio recording
		const timestamp = getFormattedTimestamp();
		const audioFileName = `audio-${timestamp}.webm`;
		const audioPath = `${file.parent?.path || ""}/${audioFileName}`;

		try {
			const mediaBlob = await this.recordAudio();
			await this.app.vault.createBinary(audioPath, mediaBlob);

			// Insert audio link
			const audioMarkdown = `\n![[${audioFileName}]] - ${timestamp}\n`;
			let content = editor.getValue();

			if (position === "top") {
				content = audioMarkdown + content;
			} else {
				content = content + audioMarkdown;
			}

			editor.setValue(content);

			new Notice(`Inserted audio at ${position}.`);
		} catch (err) {
			new Notice("Recording failed or was cancelled.");
			console.error(err);
		}

		// Return to reading mode
		// if (wasReading) view.setMode("preview");
		if (wasReading) view.currentMode.set("preview", true);
	}

	async recordAudio(): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			navigator.mediaDevices
				.getUserMedia({ audio: true })
				.then((stream) => {
					const mediaRecorder = new MediaRecorder(stream);
					const chunks: BlobPart[] = [];

					mediaRecorder.ondataavailable = (e) => {
						chunks.push(e.data);
					};

					mediaRecorder.onstop = () => {
						const blob = new Blob(chunks, { type: "audio/webm" });
						resolve(blob.arrayBuffer());
					};

					mediaRecorder.onerror = reject;

					mediaRecorder.start();
					new Notice("Recording started...");

					// Stop after 5 seconds (or use a button/dialog)
					setTimeout(() => {
						mediaRecorder.stop();
						stream.getTracks().forEach((t) => t.stop());
						new Notice("Recording stopped.");
					}, 5000);
				})
				.catch(reject);
		});
	}
}
