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

type SettingsPageTabId = "features" | "tab-zoom";

interface SettingsPageTabDefinition {
	id: SettingsPageTabId;
	label: string;
	description: string;
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
	"heading-fold": "Adds commands for folding headings to a chosen depth and stepping the fold level up or down.",
	"tab-zoom": "Stores a zoom level per tab and can show the active tab zoom in the status bar.",
};

export class WhyingSettingTab extends PluginSettingTab {
	private ctx: SettingTabContext;
	private activeTab: SettingsPageTabId = "features";
	private readonly pageTitle: string;
	private readonly pageDescription =
		"Manage Whying features from one place, then fine-tune tab zoom behavior in a focused panel.";

	constructor(app: App, plugin: Plugin, ctx: SettingTabContext) {
		super(app, plugin);
		this.ctx = ctx;
		this.pageTitle = `${plugin.manifest.name} settings`;
	}

	private getSettingsPageTabs(): readonly SettingsPageTabDefinition[] {
		return [
			{
				id: "features",
				label: "Features",
				description: "Enable or disable each Whying feature. Changes apply immediately after toggling.",
			},
			{
				id: "tab-zoom",
				label: "Tab zoom",
				description: "Adjust default zoom behavior, zoom step, and status bar visibility for the tab zoom feature.",
			},
		];
	}

	private renderSettingsPageChrome(containerEl: HTMLElement): HTMLElement {
		containerEl.addClass("whying-settings-root");

		const tabs = this.getSettingsPageTabs();
		const activeTab = tabs.find((tab) => tab.id === this.activeTab) ?? tabs[0]!;
		this.activeTab = activeTab.id;

		const pageEl = containerEl.createDiv({ cls: "whying-settings-page" });
		const heroEl = pageEl.createDiv({ cls: "whying-settings-hero" });
		const titleSetting = new Setting(heroEl).setName(this.pageTitle).setHeading();
		titleSetting.settingEl.addClass("whying-settings-page-heading");
		titleSetting.nameEl.addClass("whying-settings-page-title");
		heroEl.createEl("p", {
			cls: "whying-settings-page-description",
			text: this.pageDescription,
		});

		const tabsEl = pageEl.createDiv({ cls: "whying-settings-tabs-nav" });
		tabsEl.setAttr("role", "tablist");

		tabs.forEach((tab) => {
			const buttonEl = tabsEl.createEl("button", {
				cls: "whying-settings-tab-button",
				text: tab.label,
			});
			buttonEl.type = "button";
			buttonEl.setAttr("role", "tab");
			buttonEl.setAttr("aria-selected", String(tab.id === activeTab.id));

			if (tab.id === activeTab.id) {
				buttonEl.addClass("is-active");
			}

			buttonEl.addEventListener("click", () => {
				if (this.activeTab === tab.id) {
					return;
				}

				this.activeTab = tab.id;
				this.display();
			});
		});

		pageEl.createEl("p", {
			cls: "whying-settings-tab-description",
			text: activeTab.description,
		});

		return pageEl.createDiv({ cls: "whying-settings-tab-content" });
	}

	private renderSettingsPanel(
		containerEl: HTMLElement,
		renderContent: (panelBodyEl: HTMLElement) => void
	): void {
		const panelEl = containerEl.createDiv({ cls: "whying-settings-panel" });
		const panelBodyEl = panelEl.createDiv({ cls: "whying-settings-panel-body" });
		renderContent(panelBodyEl);
	}

	private renderFeatureSettingsSection(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Available features")
			.setDesc("Turn features on or off. Enabled features register their commands and UI hooks right away.")
			.setHeading();

		for (const feature of this.ctx.features) {
			new Setting(containerEl)
				.setName(feature.name)
				.setDesc(
					FEATURE_DESCRIPTIONS[feature.id] ??
						"Enable this feature to make its commands and behaviors available in Obsidian."
				)
				.addToggle((toggle) =>
					toggle.setValue(this.ctx.isFeatureEnabled(feature.id)).onChange(async (value) => {
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
	}

	private renderTabZoomSettingsSection(containerEl: HTMLElement): void {
		const saveTabZoomSettings = async (update: () => void) => {
			update();
			await this.ctx.saveSettings();
			this.ctx.notifyFeatureSettingsChanged("tab-zoom");
		};

		new Setting(containerEl)
			.setName("Tab zoom")
			.setDesc("Control the default zoom level for new tabs and how zoom changes are surfaced in the UI.")
			.setHeading();

		if (!this.ctx.isFeatureEnabled("tab-zoom")) {
			containerEl.createEl("p", {
				cls: "setting-item-description",
				text: "Enable the Tab zoom feature in the Features tab to configure its default zoom, zoom step, and status bar behavior.",
			});
			return;
		}

		const tz = this.ctx.settings.tabZoom;

		new Setting(containerEl)
			.setName("Default zoom")
			.setDesc("Default zoom percentage applied when a tab does not already have a saved zoom level.")
			.addSlider((slider) =>
				slider
					.setLimits(50, 200, 10)
					.setValue(tz.defaultZoom)
					.setDynamicTooltip()
					.onChange(async (value) => {
						await saveTabZoomSettings(() => {
							tz.defaultZoom = value;
						});
					})
			);

		new Setting(containerEl)
			.setName("Zoom step")
			.setDesc("Percentage increment used by the zoom in and zoom out commands.")
			.addSlider((slider) =>
				slider
					.setLimits(5, 25, 5)
					.setValue(tz.zoomStep)
					.setDynamicTooltip()
					.onChange(async (value) => {
						await saveTabZoomSettings(() => {
							tz.zoomStep = value;
						});
					})
			);

		new Setting(containerEl)
			.setName("Show in status bar")
			.setDesc("Display the current tab zoom percentage in the status bar.")
			.addToggle((toggle) =>
				toggle.setValue(tz.showStatusBar).onChange(async (value) => {
					await saveTabZoomSettings(() => {
						tz.showStatusBar = value;
					});
				})
			);

		const recordCount = Object.keys(tz.zoomRecords).length;
		new Setting(containerEl)
			.setName("Saved zoom records")
			.setDesc(`${recordCount} tab-specific zoom records are stored right now. Clear them to reset every tab.`)
			.addButton((button) =>
				button
					.setButtonText("Clear all")
					.setWarning()
					.onClick(async () => {
						await saveTabZoomSettings(() => {
							tz.zoomRecords = {};
						});
						this.display();
					})
			);
	}

	private renderActiveTab(containerEl: HTMLElement): void {
		switch (this.activeTab) {
			case "features":
				this.renderSettingsPanel(containerEl, (panelBodyEl) => {
					this.renderFeatureSettingsSection(panelBodyEl);
				});
				break;
			case "tab-zoom":
				this.renderSettingsPanel(containerEl, (panelBodyEl) => {
					this.renderTabZoomSettingsSection(panelBodyEl);
				});
				break;
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const contentEl = this.renderSettingsPageChrome(containerEl);
		this.renderActiveTab(contentEl);
	}
}
