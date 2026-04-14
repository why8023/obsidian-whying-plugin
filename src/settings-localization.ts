import { getLanguage } from "obsidian";

type SettingsPageTabId = "features" | "tab-zoom";

export interface SettingsLocalization {
	pageDescription: string;
	pageTitle: (pluginName: string) => string;
	tabs: Record<
		SettingsPageTabId,
		{
			description: string;
			label: string;
		}
	>;
	featuresSectionDescription: string;
	featuresSectionTitle: string;
	featureLabels: Record<string, string>;
	featureDescriptions: Record<string, string>;
	defaultFeatureDescription: string;
	tabZoomSectionTitle: string;
	tabZoomSectionDescription: string;
	tabZoomDisabledNotice: string;
	defaultZoomName: string;
	defaultZoomDescription: string;
	zoomStepName: string;
	zoomStepDescription: string;
	showStatusBarName: string;
	showStatusBarDescription: string;
	savedZoomRecordsName: string;
	savedZoomRecordsDescription: (count: number) => string;
	clearAllButtonText: string;
}

const ENGLISH_SETTINGS_LOCALIZATION: SettingsLocalization = {
	pageDescription:
		"Manage Whying features and tune tab zoom behavior from one place.",
	pageTitle: (pluginName) => `${pluginName} settings`,
	tabs: {
		features: {
			label: "Features",
			description: "Enable or disable each Whying feature. Changes apply immediately after toggling.",
		},
		"tab-zoom": {
			label: "Tab zoom",
			description: "Adjust default zoom behavior, zoom step, and status bar visibility for the tab zoom feature.",
		},
	},
	featuresSectionTitle: "Available features",
	featuresSectionDescription:
		"Turn features on or off. Enabled features register their commands and UI hooks right away.",
	featureLabels: {
		"heading-fold": "Heading fold",
		"tab-zoom": "Tab zoom",
	},
	featureDescriptions: {
		"heading-fold":
			"Adds commands for folding headings to a chosen depth and stepping the fold level up or down.",
		"tab-zoom": "Stores a zoom level per tab and can show the active tab zoom in the status bar.",
	},
	defaultFeatureDescription:
		"Enable this feature to make its commands and behaviors available in Obsidian.",
	tabZoomSectionTitle: "Tab zoom",
	tabZoomSectionDescription:
		"Control the default zoom level for new tabs and how zoom changes are surfaced in the UI.",
	tabZoomDisabledNotice:
		"Enable the tab zoom feature in the features tab to configure its default zoom, zoom step, and status bar behavior.",
	defaultZoomName: "Default zoom",
	defaultZoomDescription:
		"Default zoom percentage applied when a tab does not already have a saved zoom level.",
	zoomStepName: "Zoom step",
	zoomStepDescription: "Percentage increment used by the zoom in and zoom out commands.",
	showStatusBarName: "Show in status bar",
	showStatusBarDescription: "Display the current tab zoom percentage in the status bar.",
	savedZoomRecordsName: "Saved zoom records",
	savedZoomRecordsDescription: (count) =>
		`${count} tab-specific zoom records are stored right now. Clear them to reset every tab.`,
	clearAllButtonText: "Clear all",
};

const CHINESE_SETTINGS_LOCALIZATION: SettingsLocalization = {
	pageDescription: "在一个页面里统一管理 Whying 功能与标签页缩放设置。",
	pageTitle: (pluginName) => `${pluginName} 设置`,
	tabs: {
		features: {
			label: "功能",
			description: "统一开关 Whying 的各项功能。切换后会立即生效。",
		},
		"tab-zoom": {
			label: "标签页缩放",
			description: "调整标签页缩放功能的默认缩放比例、步进值，以及状态栏显示方式。",
		},
	},
	featuresSectionTitle: "可用功能",
	featuresSectionDescription: "在这里启用或禁用各项功能。启用后会立即注册对应命令和界面行为。",
	featureLabels: {
		"heading-fold": "标题折叠",
		"tab-zoom": "标签页缩放",
	},
	featureDescriptions: {
		"heading-fold": "提供按标题层级折叠，以及逐级增减折叠深度的命令。",
		"tab-zoom": "为每个标签页单独保存缩放比例，并可在状态栏显示当前缩放值。",
	},
	defaultFeatureDescription: "启用后，这项功能对应的命令和行为会在 Obsidian 中立即可用。",
	tabZoomSectionTitle: "标签页缩放",
	tabZoomSectionDescription: "设置新标签页的默认缩放比例，以及缩放变化在界面中的呈现方式。",
	tabZoomDisabledNotice: "请先在“功能”标签里启用“标签页缩放”，再配置默认缩放、步进值和状态栏显示。",
	defaultZoomName: "默认缩放",
	defaultZoomDescription: "当某个标签页还没有保存过缩放记录时，使用这个默认缩放百分比。",
	zoomStepName: "缩放步进",
	zoomStepDescription: "执行放大和缩小命令时，每次调整的百分比步进。",
	showStatusBarName: "在状态栏显示",
	showStatusBarDescription: "在状态栏中显示当前标签页的缩放百分比。",
	savedZoomRecordsName: "已保存的缩放记录",
	savedZoomRecordsDescription: (count) => `当前保存了 ${count} 条标签页专属缩放记录。清空后会重置所有标签页。`,
	clearAllButtonText: "全部清空",
};

export function getSettingsLocalization(): SettingsLocalization {
	const language = resolveLanguage();
	return language.startsWith("zh") ? CHINESE_SETTINGS_LOCALIZATION : ENGLISH_SETTINGS_LOCALIZATION;
}

function resolveLanguage(): string {
	if (typeof getLanguage === "function") {
		return normalizeLanguage(getLanguage());
	}

	if (typeof document !== "undefined") {
		const documentLanguage = document.documentElement.lang;
		if (documentLanguage) {
			return normalizeLanguage(documentLanguage);
		}
	}

	if (typeof navigator !== "undefined" && typeof navigator.language === "string") {
		return normalizeLanguage(navigator.language);
	}

	return "en";
}

function normalizeLanguage(value: string): string {
	return value.trim().toLowerCase();
}
