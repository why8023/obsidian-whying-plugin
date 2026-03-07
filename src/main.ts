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
	private activeFeatureIds = new Set<string>();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new WhyingSettingTab(this.app, this, {
			features: this.features,
			settings: this.settings,
			isFeatureEnabled: (id) => this.isFeatureEnabled(id),
			enableFeature: (f) => this.enableFeature(f),
			disableFeature: (f) => this.disableFeature(f),
			notifyFeatureSettingsChanged: (id) => this.notifyFeatureSettingsChanged(id),
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
			this.disableFeature(feature);
		}
	}

	isFeatureEnabled(featureId: string): boolean {
		return this.settings.enabledFeatures[featureId] ?? true;
	}

	enableFeature(feature: Feature): void {
		if (this.activeFeatureIds.has(feature.id)) {
			return;
		}

		feature.onload(this);
		this.activeFeatureIds.add(feature.id);
	}

	disableFeature(feature: Feature): void {
		if (!this.activeFeatureIds.has(feature.id)) {
			return;
		}

		feature.onunload();
		this.activeFeatureIds.delete(feature.id);
	}

	notifyFeatureSettingsChanged(featureId: string): void {
		if (!this.activeFeatureIds.has(featureId)) {
			return;
		}

		const feature = this.features.find((item) => item.id === featureId);
		feature?.onSettingsChanged?.();
	}

	async loadSettings(): Promise<void> {
		const loadedData: unknown = await this.loadData();
		this.settings = normalizeSettings(loadedData);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
