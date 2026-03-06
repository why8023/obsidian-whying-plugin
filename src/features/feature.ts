import type { WhyingPluginContext } from "../types";

export interface Feature {
	id: string;
	name: string;
	onload(plugin: WhyingPluginContext): void;
	onunload(): void;
}
