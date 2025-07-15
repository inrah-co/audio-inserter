import { Plugin, MarkdownView, Notice, ViewStateResult } from "obsidian";
import { getFormattedTimestamp } from "./utils";
import { stat } from "fs";

export default class AudioInserterPlugin extends Plugin {
	isRecording: boolean = false;
	mediaRecorder: MediaRecorder | null = null;
	stream: MediaStream | null = null;
	chunks: BlobPart[] = [];

	async onload() {
		const ribbonIconEl = this.addRibbonIcon(
			"microphone",
			"Toggle Audio Record",
			async () => {
				if (!this.isRecording) {
					await this.startRecording(ribbonIconEl);
				} else {
					await this.stopRecordingAndInsert(ribbonIconEl);
				}
			}
		);
		ribbonIconEl.addClass("audio-recorder-btn");
	}

	async startRecording(icon: HTMLElement) {
		try {
			this.stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			this.mediaRecorder = new MediaRecorder(this.stream);
			this.chunks = [];

			this.mediaRecorder.ondataavailable = (e) => {
				this.chunks.push(e.data);
			};

			this.mediaRecorder.start();
			this.isRecording = true;
			icon.style.color = "blue";
			new Notice("Recording started...");
		} catch (err) {
			console.error("Failed to start recording:", err);
			new Notice("Failed to access microphone.");
		}
	}

	async stopRecordingAndInsert(icon: HTMLElement) {
		if (!this.mediaRecorder || !this.stream) return;

		return new Promise<void>((resolve, reject) => {
			this.mediaRecorder!.onstop = async () => {
				const blob = new Blob(this.chunks, { type: "audio/webm" });
				const buffer = await blob.arrayBuffer();
				await this.insertAudio(buffer);
				this.stream!.getTracks().forEach((track) => track.stop());
				this.stream = null;
				this.mediaRecorder = null;
				this.isRecording = false;
				icon.style.color = "";
				new Notice("Recording stopped & inserted.");
				resolve();
			};

			this.mediaRecorder!.stop();
		});
	}

	async insertAudio(
		audioData: ArrayBuffer,
		position: "bottom" | "top" = "bottom"
	) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice("No active markdown file.");
			return;
		}

		const file = view.file;
		if (!file) return;

		const wasReading = view.getMode() === "preview";
		if (wasReading) {
			let state = view.getState();
			view.setState({ ...state, mode: "source" }, {} as ViewStateResult);
		}

		const timestamp = getFormattedTimestamp();
		const audioFileName = `audio-${timestamp}.webm`;
		const audioPath = `${file.parent?.path || ""}/${audioFileName}`;
		await this.app.vault.createBinary(audioPath, audioData);

		const editor = view.editor;
		const audioMarkdown = `\n![[${audioFileName}]] - ${timestamp}\n`;
		let content = editor.getValue();

		content =
			position === "top"
				? audioMarkdown + content
				: content + audioMarkdown;
		editor.setValue(content);

		if (wasReading) {
			let state = view.getState();
			view.setState({ ...state, mode: "preview" }, {} as ViewStateResult);
		}
	}
}
