import { Editor, Notice } from "obsidian";
import { EditorView } from "@codemirror/view";
import { StateEffect } from "@codemirror/state";
import { foldable, foldEffect, unfoldEffect, foldedRanges } from "@codemirror/language";
import type { Feature } from "./feature";
import type { WhyingPluginContext } from "../types";

interface EditorWithCodeMirror {
	cm?: unknown;
}

interface HeadingMatch {
	level: number;
	from: number;
	to: number;
}

interface FenceState {
	marker: "`" | "~";
	length: number;
}

export class HeadingFoldFeature implements Feature {
	id = "heading-fold";
	name = "Heading fold";
	private commandIds: string[] = [];
	private plugin: WhyingPluginContext | null = null;

	onload(plugin: WhyingPluginContext): void {
		this.plugin = plugin;

		for (let level = 1; level <= 6; level++) {
			const id = `fold-to-heading-level-${level}`;
			this.commandIds.push(id);
			plugin.addCommand({
				id,
				name: `Fold to H${level}`,
				editorCallback: (editor: Editor) => {
					this.foldToLevel(editor, level);
				},
			});
		}

		const unfoldId = "unfold-all-headings";
		this.commandIds.push(unfoldId);
		plugin.addCommand({
			id: unfoldId,
			name: "Unfold all headings",
			editorCallback: (editor: Editor) => {
				this.unfoldAll(editor);
			},
		});

		const increaseId = "increase-fold-level";
		this.commandIds.push(increaseId);
		plugin.addCommand({
			id: increaseId,
			name: "Increase fold level",
			editorCallback: (editor: Editor) => {
				this.changeFoldLevel(editor, 1);
			},
		});

		const decreaseId = "decrease-fold-level";
		this.commandIds.push(decreaseId);
		plugin.addCommand({
			id: decreaseId,
			name: "Decrease fold level",
			editorCallback: (editor: Editor) => {
				this.changeFoldLevel(editor, -1);
			},
		});
	}

	onunload(): void {
		if (this.plugin) {
			for (const id of this.commandIds) {
				this.plugin.removeCommand(`${this.plugin.manifest.id}:${id}`);
			}
		}
		this.commandIds = [];
		this.plugin = null;
	}

	private getEditorView(editor: Editor): EditorView | null {
		// Obsidian's public Editor API does not expose heading-level fold controls.
		const { cm } = editor as Editor & EditorWithCodeMirror;
		if (cm instanceof EditorView) {
			return cm;
		}
		return null;
	}

	private getHeadingLevel(lineText: string): number {
		const match = lineText.match(/^(?: {0,3})(#{1,6})[ \t]+/);
		return match ? match[1]!.length : 0;
	}

	private getFenceStart(lineText: string): FenceState | null {
		const match = lineText.match(/^(?: {0,3})(`{3,}|~{3,})(.*)$/);
		if (!match) {
			return null;
		}

		const marker = match[1]![0] as "`" | "~";
		const info = match[2] ?? "";
		if (marker === "`" && info.includes("`")) {
			return null;
		}

		return {
			marker,
			length: match[1]!.length,
		};
	}

	private isFenceEnd(lineText: string, fence: FenceState): boolean {
		const markerPattern = `${fence.marker}{${fence.length},}`;
		return new RegExp(`^(?: {0,3})${markerPattern}[ \\t]*$`).test(lineText);
	}

	private forEachHeading(
		state: EditorView["state"],
		callback: (heading: HeadingMatch) => void
	): void {
		const { doc } = state;
		let activeFence: FenceState | null = null;

		for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
			const line = doc.line(lineNum);

			if (activeFence) {
				if (this.isFenceEnd(line.text, activeFence)) {
					activeFence = null;
				}
				continue;
			}

			const fenceStart = this.getFenceStart(line.text);
			if (fenceStart) {
				activeFence = fenceStart;
				continue;
			}

			const level = this.getHeadingLevel(line.text);
			if (level === 0) {
				continue;
			}

			callback({
				level,
				from: line.from,
				to: line.to,
			});
		}
	}

	private getDeepestHeadingLevel(editorView: EditorView): number | null {
		let deepestHeadingLevel = 0;

		this.forEachHeading(editorView.state, ({ level: headingLevel }) => {
			if (headingLevel > deepestHeadingLevel) {
				deepestHeadingLevel = headingLevel;
			}
		});

		return deepestHeadingLevel === 0 ? null : deepestHeadingLevel;
	}

	private isRangeFolded(
		folded: ReturnType<typeof foldedRanges>,
		from: number,
		to: number
	): boolean {
		let isFolded = false;

		folded.between(from, from + 1, (foldFrom: number, foldTo: number) => {
			if (foldFrom === from && foldTo === to) {
				isFolded = true;
			}
		});

		return isFolded;
	}

	private detectCurrentFoldLevel(editorView: EditorView): number {
		const state = editorView.state;
		const folded = foldedRanges(state);

		let minFoldedLevel = 7;

		this.forEachHeading(state, ({ level: headingLevel, from, to }) => {
			const range = foldable(state, from, to);
			if (!range) {
				return;
			}

			if (this.isRangeFolded(folded, range.from, range.to) && headingLevel < minFoldedLevel) {
				minFoldedLevel = headingLevel;
			}
		});

		return minFoldedLevel;
	}

	private foldToLevel(editor: Editor, level: number) {
		const editorView = this.getEditorView(editor);
		if (!editorView) {
			new Notice("Cannot access editor view");
			return;
		}

		const state = editorView.state;
		const foldEffects: StateEffect<unknown>[] = [];

		this.forEachHeading(state, ({ level: headingLevel, from, to }) => {
			if (headingLevel > 0 && headingLevel >= level) {
				const range = foldable(state, from, to);
				if (range) {
					foldEffects.push(foldEffect.of({ from: range.from, to: range.to }));
				}
			}
		});

		if (foldEffects.length === 0) {
			new Notice(`No foldable H${level} headings found`);
			return;
		}

		const effects: StateEffect<unknown>[] = [];
		const { doc } = state;
		const folded = foldedRanges(state);
		folded.between(0, doc.length, (from: number, to: number) => {
			effects.push(unfoldEffect.of({ from, to }));
		});

		effects.push(...foldEffects);

		if (effects.length > 0) {
			editorView.dispatch({ effects });
			new Notice(`Folded to H${level}`);
		}
	}

	private unfoldAll(editor: Editor) {
		const editorView = this.getEditorView(editor);
		if (!editorView) {
			new Notice("Cannot access editor view");
			return;
		}

		const state = editorView.state;
		const doc = state.doc;
		const effects: StateEffect<unknown>[] = [];

		const folded = foldedRanges(state);
		folded.between(0, doc.length, (from: number, to: number) => {
			effects.push(unfoldEffect.of({ from, to }));
		});

		if (effects.length > 0) {
			editorView.dispatch({ effects });
			new Notice("All headings unfolded");
		} else {
			new Notice("Nothing is folded");
		}
	}

	private changeFoldLevel(editor: Editor, delta: number) {
		const editorView = this.getEditorView(editor);
		if (!editorView) {
			new Notice("Cannot access editor view");
			return;
		}

		const deepestHeadingLevel = this.getDeepestHeadingLevel(editorView);
		if (deepestHeadingLevel === null) {
			new Notice("No headings found");
			return;
		}

		const currentLevel = this.detectCurrentFoldLevel(editorView);
		const isFullyUnfolded = currentLevel > deepestHeadingLevel;

		if (delta > 0) {
			if (isFullyUnfolded) {
				new Notice("Already fully unfolded");
				return;
			}

			const newLevel = currentLevel + 1;
			if (newLevel > deepestHeadingLevel) {
				this.unfoldAll(editor);
				return;
			}

			this.foldToLevel(editor, newLevel);
		} else {
			if (isFullyUnfolded) {
				this.foldToLevel(editor, deepestHeadingLevel);
				return;
			}

			const newLevel = currentLevel - 1;
			if (newLevel < 1) {
				this.foldToLevel(editor, 1);
				return;
			}
			this.foldToLevel(editor, newLevel);
		}
	}
}
