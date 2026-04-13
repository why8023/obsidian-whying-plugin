import { getLanguage } from "obsidian";
import type { PythonScriptRunStatus } from "./features/python-script-runner-types";

type SettingsPageTabId = "features" | "tab-zoom" | "python-scripts";

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
	pythonScriptRunner: {
		sectionTitle: string;
		sectionDescription: string;
		disabledNotice: string;
		globalSectionTitle: string;
		globalSectionDescription: string;
		uvPathName: string;
		uvPathDescription: string;
		defaultTimeoutName: string;
		defaultTimeoutDescription: string;
		scriptListTitle: string;
		scriptListDescription: string;
		addScriptButtonText: string;
		noScriptsNotice: string;
		placeholdersTitle: string;
		placeholderItems: Array<{
			token: string;
			description: string;
		}>;
		unnamedScript: (index: number) => string;
		nameName: string;
		nameDescription: string;
		enabledName: string;
		enabledDescription: string;
		standaloneScriptName: string;
		standaloneScriptDescription: string;
		projectPathName: string;
		projectPathDescription: string;
		projectPathDisabledDescription: string;
		projectPathPlaceholder: string;
		scriptPathName: string;
		scriptPathDescription: string;
		scriptPathPlaceholder: string;
		workingDirectoryName: string;
		workingDirectoryStandaloneDescription: string;
		workingDirectoryStandalonePlaceholder: string;
		workingDirectoryProjectDescription: string;
		workingDirectoryProjectPlaceholder: string;
		argsTemplateName: string;
		argsTemplateDescription: string;
		timeoutName: string;
		timeoutDescription: string;
		timeoutPlaceholder: string;
		actionsName: string;
		actionsDescription: string;
		runButtonText: string;
		runningButtonText: string;
		deleteButtonText: string;
		lastRunTitle: string;
		lastRunDescription: string;
		noLastRunNotice: string;
		scriptNameName: string;
		statusName: string;
		statusLabels: Record<PythonScriptRunStatus, string>;
		startedAtName: string;
		endedAtName: string;
		exitCodeName: string;
		signalName: string;
		errorMessageName: string;
		resolvedCommandName: string;
		stdoutName: string;
		stderrName: string;
	};
}

const ENGLISH_SETTINGS_LOCALIZATION: SettingsLocalization = {
	pageDescription:
		"Manage Whying features, tune tab zoom behavior, and configure local Python script runs from one place.",
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
		"python-scripts": {
			label: "Python scripts",
			description: "Maintain Python script entries, run them through UV, and review the latest execution record.",
		},
	},
	featuresSectionTitle: "Available features",
	featuresSectionDescription:
		"Turn features on or off. Enabled features register their commands and UI hooks right away.",
	featureLabels: {
		"heading-fold": "Heading fold",
		"tab-zoom": "Tab zoom",
		"python-script-runner": "Python script runner",
	},
	featureDescriptions: {
		"heading-fold":
			"Adds commands for folding headings to a chosen depth and stepping the fold level up or down.",
		"tab-zoom": "Stores a zoom level per tab and can show the active tab zoom in the status bar.",
		"python-script-runner":
			"Stores Python script definitions, runs the active file through UV, and records the latest output and error details.",
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
	pythonScriptRunner: {
		sectionTitle: "Python script runner",
		sectionDescription:
			"Manage Python script entries, run them against the current file, and inspect the latest execution logs.",
		disabledNotice:
			"Enable the Python script runner feature in the features tab to run scripts. You can still edit the saved configurations here.",
		globalSectionTitle: "Global configuration",
		globalSectionDescription: "Define how the plugin finds UV and which timeout to use by default.",
		uvPathName: "UV path",
		uvPathDescription: "Executable name or absolute path used to start UV. Keep `uv` if it is already on PATH.",
		defaultTimeoutName: "Default timeout (ms)",
		defaultTimeoutDescription: "Fallback timeout used when a script entry does not define its own timeout.",
		scriptListTitle: "Scripts",
		scriptListDescription: "Each entry stores one Python script configuration that can be launched for the active file.",
		addScriptButtonText: "Add script",
		noScriptsNotice: "No script entries yet. Add one to start building your UV-based workflow.",
		placeholdersTitle: "Available placeholders",
		placeholderItems: [
			{ token: "${file}", description: "Absolute path of the active file." },
			{ token: "${folder}", description: "Absolute path of the active file's parent folder." },
			{ token: "${vault}", description: "Absolute path of the current vault root." },
			{ token: "${name}", description: "Active file name without its extension." },
			{ token: "${path}", description: "Active file path relative to the vault root." },
		],
		unnamedScript: (index) => `Python script ${index}`,
		nameName: "Name",
		nameDescription: "Label shown in settings and in the latest execution record.",
		enabledName: "Enabled",
		enabledDescription: "Disable a script entry without deleting the saved configuration.",
		standaloneScriptName: "Run as standalone script",
		standaloneScriptDescription:
			"When enabled, uv runs the script in its own isolated environment using dependency metadata in the script header. When disabled, uv uses the configured project path instead.",
		projectPathName: "Project path",
		projectPathDescription: "Project root passed to `uv run --project` when standalone script mode is disabled.",
		projectPathDisabledDescription: "Not used while standalone script mode is enabled.",
		projectPathPlaceholder: "C:\\path\\to\\python-project",
		scriptPathName: "Script path",
		scriptPathDescription: "Python script file to execute. Relative paths are resolved from the vault root and should usually point into `scripts/`.",
		scriptPathPlaceholder: "scripts/example.py",
		workingDirectoryName: "Working directory",
		workingDirectoryStandaloneDescription: "Optional. Leave blank to run from the script's own folder.",
		workingDirectoryStandalonePlaceholder: "Leave blank to use the script folder",
		workingDirectoryProjectDescription: "Optional. Leave blank to run from the configured project path.",
		workingDirectoryProjectPlaceholder: "Leave blank to use the project path",
		argsTemplateName: "Arguments template",
		argsTemplateDescription: "Space-separated arguments with optional placeholders. Standalone script mode reads dependencies from the script header; project mode uses the selected project environment.",
		timeoutName: "Timeout override (ms)",
		timeoutDescription: "Optional. Leave blank to use the global default timeout.",
		timeoutPlaceholder: "Use global timeout",
		actionsName: "Run and maintenance",
		actionsDescription: "Run this script against the current active file, or remove the saved configuration.",
		runButtonText: "Run current file",
		runningButtonText: "Running...",
		deleteButtonText: "Delete",
		lastRunTitle: "Latest execution",
		lastRunDescription: "Review the most recent execution record, including command, output, and error details.",
		noLastRunNotice: "No script has been run yet.",
		scriptNameName: "Script",
		statusName: "Status",
		statusLabels: {
			idle: "Idle",
			running: "Running",
			success: "Success",
			error: "Error",
			timeout: "Timeout",
			spawn_error: "Start failed",
		},
		startedAtName: "Started at",
		endedAtName: "Ended at",
		exitCodeName: "Exit code",
		signalName: "Signal",
		errorMessageName: "Error message",
		resolvedCommandName: "Resolved command",
		stdoutName: "stdout",
		stderrName: "stderr",
	},
};

const CHINESE_SETTINGS_LOCALIZATION: SettingsLocalization = {
	pageDescription: "在一个页面里统一管理 Whying 功能、标签页缩放，以及本地 Python 脚本运行配置。",
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
		"python-scripts": {
			label: "Python 脚本",
			description: "维护 Python 脚本配置，通过 UV 运行当前文件，并查看最近一次执行记录。",
		},
	},
	featuresSectionTitle: "可用功能",
	featuresSectionDescription: "在这里启用或禁用各项功能。启用后会立即注册对应命令和界面行为。",
	featureLabels: {
		"heading-fold": "标题折叠",
		"tab-zoom": "标签页缩放",
		"python-script-runner": "Python 脚本运行",
	},
	featureDescriptions: {
		"heading-fold": "提供按标题层级折叠，以及逐级增减折叠深度的命令。",
		"tab-zoom": "为每个标签页单独保存缩放比例，并可在状态栏显示当前缩放值。",
		"python-script-runner": "维护 Python 脚本配置，通过 UV 运行当前文件，并记录最近一次执行的输出和错误信息。",
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
	pythonScriptRunner: {
		sectionTitle: "Python 脚本运行",
		sectionDescription: "在这里维护 Python 脚本配置，用当前文件触发运行，并查看最近一次执行日志。",
		disabledNotice: "请先在“功能”标签里启用“Python 脚本运行”，再执行脚本。你仍然可以先在这里编辑配置。",
		globalSectionTitle: "全局配置",
		globalSectionDescription: "配置 UV 可执行路径，以及脚本默认超时时间。",
		uvPathName: "UV 路径",
		uvPathDescription: "用于启动 UV 的可执行名或绝对路径。如果系统 PATH 已配置好，保持 `uv` 即可。",
		defaultTimeoutName: "默认超时（毫秒）",
		defaultTimeoutDescription: "当脚本项没有单独设置超时时间时，使用这个默认值。",
		scriptListTitle: "脚本列表",
		scriptListDescription: "每一项对应一个 Python 脚本配置，可直接针对当前活动文件运行。",
		addScriptButtonText: "新增脚本",
		noScriptsNotice: "还没有脚本配置。先新增一项，再开始搭建你的 UV 工作流。",
		placeholdersTitle: "可用占位符",
		placeholderItems: [
			{ token: "${file}", description: "当前活动文件的绝对路径。" },
			{ token: "${folder}", description: "当前活动文件所在目录的绝对路径。" },
			{ token: "${vault}", description: "当前 Vault 根目录的绝对路径。" },
			{ token: "${name}", description: "当前文件名（不含扩展名）。" },
			{ token: "${path}", description: "当前文件相对于 Vault 根目录的路径。" },
		],
		unnamedScript: (index) => `Python 脚本 ${index}`,
		nameName: "名称",
		nameDescription: "显示在设置页和最近一次执行记录里的名称。",
		enabledName: "启用",
		enabledDescription: "关闭后会保留配置，但不会允许执行。",
		standaloneScriptName: "独立脚本模式",
		standaloneScriptDescription: "开启后，使用脚本头部依赖通过独立环境运行。关闭后，使用下方 project 路径指定的环境运行。",
		projectPathName: "Project 路径",
		projectPathDescription: "当独立脚本模式关闭时，会传给 `uv run --project` 作为环境根目录。",
		projectPathDisabledDescription: "独立脚本模式开启时，这个字段不会参与运行。",
		projectPathPlaceholder: "C:\\path\\to\\python-project",
		scriptPathName: "脚本路径",
		scriptPathDescription: "要执行的 Python 脚本文件。相对路径会按 Vault 根目录解析，通常建议放在 `scripts/` 目录里。",
		scriptPathPlaceholder: "scripts/example.py",
		workingDirectoryName: "工作目录",
		workingDirectoryStandaloneDescription: "可选。不填时默认使用脚本所在目录。",
		workingDirectoryStandalonePlaceholder: "留空则使用脚本目录",
		workingDirectoryProjectDescription: "可选。不填时默认使用 project 路径。",
		workingDirectoryProjectPlaceholder: "留空则使用 project 路径",
		argsTemplateName: "参数模板",
		argsTemplateDescription: "用空格分隔参数，可插入占位符；独立脚本模式读取脚本头部依赖，project 模式则使用你指定的项目环境。",
		timeoutName: "超时覆盖（毫秒）",
		timeoutDescription: "可选。不填则使用上方的默认超时时间。",
		timeoutPlaceholder: "使用全局默认值",
		actionsName: "运行与维护",
		actionsDescription: "用当前活动文件运行这条脚本，或删除这条保存的配置。",
		runButtonText: "运行当前文件",
		runningButtonText: "运行中...",
		deleteButtonText: "删除",
		lastRunTitle: "最近一次执行",
		lastRunDescription: "查看最近一次脚本执行记录，包括命令、输出日志和错误信息。",
		noLastRunNotice: "还没有执行记录。",
		scriptNameName: "脚本",
		statusName: "状态",
		statusLabels: {
			idle: "空闲",
			running: "运行中",
			success: "成功",
			error: "失败",
			timeout: "超时",
			spawn_error: "启动失败",
		},
		startedAtName: "开始时间",
		endedAtName: "结束时间",
		exitCodeName: "退出码",
		signalName: "信号",
		errorMessageName: "错误信息",
		resolvedCommandName: "实际执行命令",
		stdoutName: "标准输出",
		stderrName: "标准错误",
	},
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
