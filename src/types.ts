import type { Plugin } from "obsidian";
import type { WhyingPluginSettings } from "./settings";

export interface WhyingPluginContext extends Plugin {
	settings: WhyingPluginSettings;
	saveSettings(): Promise<void>;
}
