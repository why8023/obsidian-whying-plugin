import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { Feature } from "./features/feature";
import { renderPythonScriptRunnerSettings } from "./features/python-script-runner-settings";
import { PythonScriptRunnerFeature } from "./features/python-script-runner";
import {
	PYTHON_SCRIPT_RUNNER_DEFAULT_ARGS_TEMPLATE,
	PYTHON_SCRIPT_RUNNER_DEFAULTS,
	PYTHON_SCRIPT_RUNNER_FEATURE_ID,
	createPythonScriptRunnerSettings,
	type PythonScriptExecutionMode,
	type PythonScriptConfig,
	type PythonScriptLastRunRecord,
	type PythonScriptRunStatus,
	type PythonScriptRunnerSettings,
} from "./features/python-script-runner-types";
import { getSettingsLocalization, type SettingsLocalization } from "./settings-localization";
import { TAB_ZOOM_DEFAULTS, type TabZoomSettings } from "./features/tab-zoom";

export interface WhyingPluginSettings {
	enabledFeatures: Record<string, boolean>;
	tabZoom: TabZoomSettings;
	pythonScriptRunner: PythonScriptRunnerSettings;
}

export const DEFAULT_SETTINGS: WhyingPluginSettings = {
	enabledFeatures: {},
	tabZoom: {
		...TAB_ZOOM_DEFAULTS,
		zoomRecords: { ...TAB_ZOOM_DEFAULTS.zoomRecords },
	},
	pythonScriptRunner: createPythonScriptRunnerSettings(),
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

function normalizeString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function normalizeOptionalPositiveNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function normalizePythonScriptRunStatus(value: unknown): PythonScriptRunStatus {
	switch (value) {
		case "idle":
		case "running":
		case "success":
		case "error":
		case "timeout":
		case "spawn_error":
			return value;
		default:
			return "idle";
	}
}

function normalizePythonScriptExecutionMode(value: unknown): PythonScriptExecutionMode | undefined {
	switch (value) {
		case "standalone-script":
		case "project":
			return value;
		default:
			return undefined;
	}
}

function normalizePythonScriptConfig(value: unknown): PythonScriptConfig | null {
	if (!isRecord(value)) {
		return null;
	}

	const id = normalizeString(value.id).trim();
	if (!id) {
		return null;
	}

	const normalizedProjectPath = normalizeString(value.projectPath);
	const normalizedExecutionMode = normalizePythonScriptExecutionMode(value.executionMode);
	const useIsolatedScript =
		typeof value.useIsolatedScript === "boolean"
			? value.useIsolatedScript
			: normalizedExecutionMode !== undefined
				? normalizedExecutionMode === "standalone-script"
				: normalizedProjectPath.trim().length === 0;

	return {
		id,
		name: normalizeString(value.name),
		enabled: normalizeBoolean(value.enabled, true),
		useIsolatedScript,
		projectPath: normalizedProjectPath,
		scriptPath: normalizeString(value.scriptPath),
		workingDirectory: normalizeString(value.workingDirectory),
		argsTemplate: normalizeString(value.argsTemplate, PYTHON_SCRIPT_RUNNER_DEFAULT_ARGS_TEMPLATE),
		timeoutMs: normalizeOptionalPositiveNumber(value.timeoutMs),
	};
}

function normalizePythonScriptConfigs(value: unknown): PythonScriptConfig[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((item) => normalizePythonScriptConfig(item))
		.filter((item): item is PythonScriptConfig => item !== null);
}

function normalizePythonScriptLastRunRecord(value: unknown): PythonScriptLastRunRecord | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const scriptId = normalizeString(value.scriptId).trim();
	const scriptName = normalizeString(value.scriptName).trim();
	if (!scriptId || !scriptName) {
		return undefined;
	}

	return {
		scriptId,
		scriptName,
		status: normalizePythonScriptRunStatus(value.status),
		startedAt:
			typeof value.startedAt === "number" && Number.isFinite(value.startedAt) ? value.startedAt : undefined,
		endedAt: typeof value.endedAt === "number" && Number.isFinite(value.endedAt) ? value.endedAt : undefined,
		exitCode:
			typeof value.exitCode === "number" && Number.isFinite(value.exitCode)
				? value.exitCode
				: value.exitCode === null
					? null
					: undefined,
		signal: typeof value.signal === "string" ? value.signal : value.signal === null ? null : undefined,
		stdout: typeof value.stdout === "string" ? value.stdout : undefined,
		stderr: typeof value.stderr === "string" ? value.stderr : undefined,
		errorMessage: typeof value.errorMessage === "string" ? value.errorMessage : undefined,
		resolvedCommand: typeof value.resolvedCommand === "string" ? value.resolvedCommand : undefined,
	};
}

function normalizePythonScriptRunnerSettings(value: unknown): PythonScriptRunnerSettings {
	const rawRunnerSettings = isRecord(value) ? value : {};

	return {
		uvPath: normalizeString(rawRunnerSettings.uvPath, PYTHON_SCRIPT_RUNNER_DEFAULTS.uvPath),
		defaultTimeoutMs: normalizePositiveNumber(
			rawRunnerSettings.defaultTimeoutMs,
			PYTHON_SCRIPT_RUNNER_DEFAULTS.defaultTimeoutMs
		),
		scripts: normalizePythonScriptConfigs(rawRunnerSettings.scripts),
		lastRun: normalizePythonScriptLastRunRecord(rawRunnerSettings.lastRun),
	};
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
		pythonScriptRunner: normalizePythonScriptRunnerSettings(rawSettings.pythonScriptRunner),
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

type SettingsPageTabId = "features" | "tab-zoom" | "python-scripts";

interface SettingsPageTabDefinition {
	id: SettingsPageTabId;
	label: string;
	description: string;
}

export class WhyingSettingTab extends PluginSettingTab {
	private ctx: SettingTabContext;
	private activeTab: SettingsPageTabId = "features";
	private readonly pluginName: string;

	constructor(app: App, plugin: Plugin, ctx: SettingTabContext) {
		super(app, plugin);
		this.ctx = ctx;
		this.pluginName = plugin.manifest.name;
	}

	private getSettingsPageTabs(strings: SettingsLocalization): readonly SettingsPageTabDefinition[] {
		return [
			{
				id: "features",
				label: strings.tabs.features.label,
				description: strings.tabs.features.description,
			},
			{
				id: "tab-zoom",
				label: strings.tabs["tab-zoom"].label,
				description: strings.tabs["tab-zoom"].description,
			},
			{
				id: "python-scripts",
				label: strings.tabs["python-scripts"].label,
				description: strings.tabs["python-scripts"].description,
			},
		];
	}

	private renderSettingsPageChrome(containerEl: HTMLElement, strings: SettingsLocalization): HTMLElement {
		containerEl.addClass("whying-settings-root");

		const tabs = this.getSettingsPageTabs(strings);
		const activeTab = tabs.find((tab) => tab.id === this.activeTab) ?? tabs[0]!;
		this.activeTab = activeTab.id;

		const pageEl = containerEl.createDiv({ cls: "whying-settings-page" });
		const heroEl = pageEl.createDiv({ cls: "whying-settings-hero" });
		const titleSetting = new Setting(heroEl).setName(strings.pageTitle(this.pluginName)).setHeading();
		titleSetting.settingEl.addClass("whying-settings-page-heading");
		titleSetting.nameEl.addClass("whying-settings-page-title");
		heroEl.createEl("p", {
			cls: "whying-settings-page-description",
			text: strings.pageDescription,
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
		const strings = getSettingsLocalization();

		new Setting(containerEl)
			.setName(strings.featuresSectionTitle)
			.setDesc(strings.featuresSectionDescription)
			.setHeading();

		for (const feature of this.ctx.features) {
			new Setting(containerEl)
				.setName(strings.featureLabels[feature.id] ?? feature.name)
				.setDesc(
					strings.featureDescriptions[feature.id] ?? strings.defaultFeatureDescription
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
		const strings = getSettingsLocalization();

		const saveTabZoomSettings = async (update: () => void) => {
			update();
			await this.ctx.saveSettings();
			this.ctx.notifyFeatureSettingsChanged("tab-zoom");
		};

		new Setting(containerEl)
			.setName(strings.tabZoomSectionTitle)
			.setDesc(strings.tabZoomSectionDescription)
			.setHeading();

		if (!this.ctx.isFeatureEnabled("tab-zoom")) {
			containerEl.createEl("p", {
				cls: "setting-item-description",
				text: strings.tabZoomDisabledNotice,
			});
			return;
		}

		const tz = this.ctx.settings.tabZoom;

		new Setting(containerEl)
			.setName(strings.defaultZoomName)
			.setDesc(strings.defaultZoomDescription)
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
			.setName(strings.zoomStepName)
			.setDesc(strings.zoomStepDescription)
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
			.setName(strings.showStatusBarName)
			.setDesc(strings.showStatusBarDescription)
			.addToggle((toggle) =>
				toggle.setValue(tz.showStatusBar).onChange(async (value) => {
					await saveTabZoomSettings(() => {
						tz.showStatusBar = value;
					});
				})
			);

		const recordCount = Object.keys(tz.zoomRecords).length;
		new Setting(containerEl)
			.setName(strings.savedZoomRecordsName)
			.setDesc(strings.savedZoomRecordsDescription(recordCount))
			.addButton((button) =>
				button
					.setButtonText(strings.clearAllButtonText)
					.setWarning()
					.onClick(async () => {
						await saveTabZoomSettings(() => {
							tz.zoomRecords = {};
						});
						this.display();
					})
			);
	}

	private getPythonScriptRunnerFeature(): PythonScriptRunnerFeature | null {
		const feature = this.ctx.features.find((item) => item.id === PYTHON_SCRIPT_RUNNER_FEATURE_ID);
		return feature instanceof PythonScriptRunnerFeature ? feature : null;
	}

	private renderPythonScriptRunnerSettingsSection(containerEl: HTMLElement): void {
		const strings = getSettingsLocalization();
		renderPythonScriptRunnerSettings(containerEl, {
			ctx: this.ctx,
			feature: this.getPythonScriptRunnerFeature(),
			strings: strings.pythonScriptRunner,
			isFeatureEnabled: this.ctx.isFeatureEnabled(PYTHON_SCRIPT_RUNNER_FEATURE_ID),
			refresh: () => this.display(),
		});
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
			case "python-scripts":
				this.renderSettingsPanel(containerEl, (panelBodyEl) => {
					this.renderPythonScriptRunnerSettingsSection(panelBodyEl);
				});
				break;
		}
	}

	display(): void {
		const { containerEl } = this;
		const strings = getSettingsLocalization();
		containerEl.empty();
		const contentEl = this.renderSettingsPageChrome(containerEl, strings);
		this.renderActiveTab(contentEl);
	}
}
