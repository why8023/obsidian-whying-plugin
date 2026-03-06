import { Plugin } from "obsidian";
import type { Feature } from "./features/feature";
import { HeadingFoldFeature } from "./features/heading-fold";
import { WhyingSettingTab, DEFAULT_SETTINGS, type WhyingPluginSettings } from "./settings";

export default class WhyingPlugin extends Plugin {
	settings: WhyingPluginSettings = DEFAULT_SETTINGS;
	features: Feature[] = [
		new HeadingFoldFeature(),
	];

	async onload() {
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

	onunload() {
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
