import type { Plugin } from "obsidian";

export interface Feature {
	id: string;
	name: string;
	onload(plugin: Plugin): void;
	onunload(): void;
}
