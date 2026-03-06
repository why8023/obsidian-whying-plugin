import { Editor, Notice } from "obsidian";
import { EditorView } from "@codemirror/view";
import { StateEffect } from "@codemirror/state";
import { foldable, foldEffect, unfoldEffect, foldedRanges } from "@codemirror/language";
import type { Feature } from "./feature";
import type { WhyingPluginContext } from "../types";

interface EditorWithCodeMirror {
	cm?: unknown;
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
		const { cm } = editor as Editor & EditorWithCodeMirror;
		if (cm instanceof EditorView) {
			return cm;
		}
		return null;
	}

	private getHeadingLevel(lineText: string): number {
		const match = lineText.match(/^(#{1,6})\s/);
		return match ? match[1]!.length : 0;
	}

	private detectCurrentFoldLevel(editorView: EditorView): number {
		const state = editorView.state;
		const doc = state.doc;
		const folded = foldedRanges(state);

		let minFoldedLevel = 7;

		for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
			const line = doc.line(lineNum);
			const headingLevel = this.getHeadingLevel(line.text);
			if (headingLevel === 0) continue;

			let isFolded = false;
			folded.between(line.from, line.to + 1, () => {
				isFolded = true;
			});

			if (isFolded && headingLevel < minFoldedLevel) {
				minFoldedLevel = headingLevel;
			}
		}

		return minFoldedLevel;
	}

	private foldToLevel(editor: Editor, level: number) {
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

		for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
			const line = doc.line(lineNum);
			const headingLevel = this.getHeadingLevel(line.text);

			if (headingLevel > 0 && headingLevel >= level) {
				const range = foldable(state, line.from, line.to);
				if (range) {
					effects.push(foldEffect.of({ from: range.from, to: range.to }));
				}
			}
		}

		if (effects.length > 0) {
			editorView.dispatch({ effects });
			new Notice(`Folded to H${level}`);
		} else {
			new Notice(`No foldable H${level} headings found`);
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

		const currentLevel = this.detectCurrentFoldLevel(editorView);

		if (delta > 0) {
			const newLevel = currentLevel + 1;
			if (newLevel > 6) {
				this.unfoldAll(editor);
				return;
			}
			this.foldToLevel(editor, newLevel);
		} else {
			const newLevel = currentLevel - 1;
			if (newLevel < 1) {
				this.foldToLevel(editor, 1);
				return;
			}
			this.foldToLevel(editor, newLevel);
		}
	}
}
