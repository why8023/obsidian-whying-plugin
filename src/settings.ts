import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { Feature } from "./features/feature";
import { TAB_ZOOM_DEFAULTS, type TabZoomSettings } from "./features/tab-zoom";

export interface WhyingPluginSettings {
	enabledFeatures: Record<string, boolean>;
	tabZoom: TabZoomSettings;
}

export const DEFAULT_SETTINGS: WhyingPluginSettings = {
	enabledFeatures: {},
	tabZoom: {
		...TAB_ZOOM_DEFAULTS,
		zoomRecords: { ...TAB_ZOOM_DEFAULTS.zoomRecords },
	},
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
	if (!isRecord(value)) {
		return {};
	}

	const normalized: Record<string, boolean> = {};

	for (const [key, item] of Object.entries(value)) {
		if (typeof item === "boolean") {
			normalized[key] = item;
		}
	}

	return normalized;
}

function normalizePositiveNumberRecord(value: unknown): Record<string, number> {
	if (!isRecord(value)) {
		return {};
	}

	const normalized: Record<string, number> = {};

	for (const [key, item] of Object.entries(value)) {
		if (typeof item === "number" && Number.isFinite(item) && item > 0) {
			normalized[key] = item;
		}
	}

	return normalized;
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

export function normalizeSettings(data: unknown): WhyingPluginSettings {
	const rawSettings = isRecord(data) ? data : {};
	const rawTabZoom = isRecord(rawSettings.tabZoom) ? rawSettings.tabZoom : {};

	return {
		enabledFeatures: normalizeBooleanRecord(rawSettings.enabledFeatures),
		tabZoom: {
			defaultZoom: normalizePositiveNumber(rawTabZoom.defaultZoom, TAB_ZOOM_DEFAULTS.defaultZoom),
			zoomStep: normalizePositiveNumber(rawTabZoom.zoomStep, TAB_ZOOM_DEFAULTS.zoomStep),
			showStatusBar: normalizeBoolean(rawTabZoom.showStatusBar, TAB_ZOOM_DEFAULTS.showStatusBar),
			zoomRecords: normalizePositiveNumberRecord(rawTabZoom.zoomRecords),
		},
	};
}

export interface SettingTabContext {
	features: Feature[];
	settings: WhyingPluginSettings;
	isFeatureEnabled(featureId: string): boolean;
	enableFeature(feature: Feature): void;
	disableFeature(feature: Feature): void;
	notifyFeatureSettingsChanged(featureId: string): void;
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

		const saveTabZoomSettings = async (update: () => void) => {
			update();
			await this.ctx.saveSettings();
			this.ctx.notifyFeatureSettingsChanged("tab-zoom");
		};

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
								this.ctx.disableFeature(feature);
							}
							this.display();
						})
				);
		}

		// --- Tab Zoom settings ---
		if (this.ctx.isFeatureEnabled("tab-zoom")) {
			new Setting(containerEl)
				.setName("Tab zoom")
				.setHeading();
			const tz = this.ctx.settings.tabZoom;

			new Setting(containerEl)
				.setName("Default zoom")
				.setDesc("Default zoom percentage for new tabs")
				.addSlider((s) =>
					s.setLimits(50, 200, 10).setValue(tz.defaultZoom).setDynamicTooltip()
						.onChange(async (v) => {
							await saveTabZoomSettings(() => {
								tz.defaultZoom = v;
							});
						})
				);

			new Setting(containerEl)
				.setName("Zoom step")
				.setDesc("Percentage increment per zoom in/out")
				.addSlider((s) =>
					s.setLimits(5, 25, 5).setValue(tz.zoomStep).setDynamicTooltip()
						.onChange(async (v) => {
							await saveTabZoomSettings(() => {
								tz.zoomStep = v;
							});
						})
				);

			new Setting(containerEl)
				.setName("Show in status bar")
				.setDesc("Display current zoom level in the status bar")
				.addToggle((t) =>
					t.setValue(tz.showStatusBar)
						.onChange(async (v) => {
							await saveTabZoomSettings(() => {
								tz.showStatusBar = v;
							});
						})
				);

			const recordCount = Object.keys(tz.zoomRecords).length;
			new Setting(containerEl)
				.setName("Zoom records")
				.setDesc(`${recordCount} saved tab zoom records. Clear to reset all.`)
				.addButton((b) =>
					b.setButtonText("Clear all").setWarning()
						.onClick(async () => {
							await saveTabZoomSettings(() => {
								tz.zoomRecords = {};
							});
							this.display();
						})
				);
		}
	}
}
