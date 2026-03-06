import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { Feature } from "./features/feature";

export interface WhyingPluginSettings {
	enabledFeatures: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: WhyingPluginSettings = {
	enabledFeatures: {},
};

export interface SettingTabContext {
	features: Feature[];
	settings: WhyingPluginSettings;
	isFeatureEnabled(featureId: string): boolean;
	enableFeature(feature: Feature): void;
	saveSettings(): Promise<void>;
}

export class WhyingSettingTab extends PluginSettingTab {
	private ctx: SettingTabContext;

	constructor(app: App, plugin: Plugin, ctx: SettingTabContext) {
		super(app, plugin);
		this.ctx = ctx;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		for (const feature of this.ctx.features) {
			new Setting(containerEl)
				.setName(feature.name)
				.addToggle((toggle) =>
					toggle
						.setValue(this.ctx.isFeatureEnabled(feature.id))
						.onChange(async (value) => {
							this.ctx.settings.enabledFeatures[feature.id] = value;
							await this.ctx.saveSettings();
							if (value) {
								this.ctx.enableFeature(feature);
							} else {
								feature.onunload();
							}
						})
				);
		}
	}
}
