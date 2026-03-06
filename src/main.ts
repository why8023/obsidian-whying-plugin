import { Plugin } from "obsidian";
import type { Feature } from "./features/feature";
import { HeadingFoldFeature } from "./features/heading-fold";
import { TabZoomFeature } from "./features/tab-zoom";
import { WhyingSettingTab, DEFAULT_SETTINGS, normalizeSettings, type WhyingPluginSettings } from "./settings";
import type { WhyingPluginContext } from "./types";

export default class WhyingPlugin extends Plugin implements WhyingPluginContext {
	settings: WhyingPluginSettings = DEFAULT_SETTINGS;
	features: Feature[] = [
		new HeadingFoldFeature(),
		new TabZoomFeature(),
	];

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new WhyingSettingTab(this.app, this, {
			features: this.features,
			settings: this.settings,
			isFeatureEnabled: (id) => this.isFeatureEnabled(id),
			enableFeature: (f) => this.enableFeature(f),
			saveSettings: () => this.saveSettings(),
		}));

		for (const feature of this.features) {
			if (this.isFeatureEnabled(feature.id)) {
				this.enableFeature(feature);
			}
		}
	}

	onunload(): void {
		for (const feature of this.features) {
			feature.onunload();
		}
	}

	isFeatureEnabled(featureId: string): boolean {
		return this.settings.enabledFeatures[featureId] ?? true;
	}

	enableFeature(feature: Feature): void {
		feature.onload(this);
	}

	async loadSettings(): Promise<void> {
		const loadedData: unknown = await this.loadData();
		this.settings = normalizeSettings(loadedData);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
