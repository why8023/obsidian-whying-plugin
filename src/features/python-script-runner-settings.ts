import { Notice, Setting } from "obsidian";
import type { SettingTabContext } from "../settings";
import type { SettingsLocalization } from "../settings-localization";
import { PythonScriptRunnerFeature } from "./python-script-runner";
import {
	PYTHON_SCRIPT_RUNNER_DEFAULTS,
	PYTHON_SCRIPT_RUNNER_FEATURE_ID,
	createPythonScriptConfig,
	type PythonScriptConfig,
	type PythonScriptLastRunRecord,
	type PythonScriptRunnerSettings,
} from "./python-script-runner-types";

interface RenderPythonScriptRunnerSettingsOptions {
	ctx: SettingTabContext;
	feature: PythonScriptRunnerFeature | null;
	strings: SettingsLocalization["pythonScriptRunner"];
	isFeatureEnabled: boolean;
	refresh: () => void;
}

export function renderPythonScriptRunnerSettings(
	containerEl: HTMLElement,
	options: RenderPythonScriptRunnerSettingsOptions
): void {
	const { ctx, feature, strings, isFeatureEnabled, refresh } = options;
	const runnerSettings = ctx.settings.pythonScriptRunner;

	new Setting(containerEl)
		.setName(strings.sectionTitle)
		.setDesc(strings.sectionDescription)
		.setHeading();

	if (!isFeatureEnabled) {
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: strings.disabledNotice,
		});
	}

	renderGlobalSettingsSection(containerEl, runnerSettings, strings, (update) => saveAndNotify(ctx, update));

	renderScriptsSection(containerEl, {
		ctx,
		feature,
		strings,
		isFeatureEnabled,
		refresh,
	});

	renderLastRunSection(containerEl, runnerSettings.lastRun, strings);
}

function renderGlobalSettingsSection(
	containerEl: HTMLElement,
	settings: PythonScriptRunnerSettings,
	strings: SettingsLocalization["pythonScriptRunner"],
	save: (update: () => void) => Promise<void>
): void {
	new Setting(containerEl)
		.setName(strings.globalSectionTitle)
		.setDesc(strings.globalSectionDescription)
		.setHeading();

	new Setting(containerEl)
		.setName(strings.uvPathName)
		.setDesc(strings.uvPathDescription)
		.addText((text) =>
			text.setPlaceholder(PYTHON_SCRIPT_RUNNER_DEFAULTS.uvPath).setValue(settings.uvPath).onChange(async (value) => {
				await save(() => {
					settings.uvPath = value.trim();
				});
			})
		);

	new Setting(containerEl)
		.setName(strings.defaultTimeoutName)
		.setDesc(strings.defaultTimeoutDescription)
		.addText((text) => {
			text.inputEl.type = "number";
			text.inputEl.min = "1";
			text.setPlaceholder(String(PYTHON_SCRIPT_RUNNER_DEFAULTS.defaultTimeoutMs));
			text.setValue(String(settings.defaultTimeoutMs));
			text.onChange(async (value) => {
				const parsed = Number.parseInt(value, 10);
				if (!Number.isFinite(parsed) || parsed <= 0) {
					return;
				}

				await save(() => {
					settings.defaultTimeoutMs = parsed;
				});
			});
		});
}

function renderScriptsSection(
	containerEl: HTMLElement,
	options: RenderPythonScriptRunnerSettingsOptions
): void {
	const { ctx, feature, strings, isFeatureEnabled, refresh } = options;
	const runnerSettings = ctx.settings.pythonScriptRunner;

	new Setting(containerEl)
		.setName(strings.scriptListTitle)
		.setDesc(strings.scriptListDescription)
		.setHeading()
		.addButton((button) =>
			button.setButtonText(strings.addScriptButtonText).setCta().onClick(async () => {
				await saveAndNotify(ctx, () => {
					runnerSettings.scripts.push(createPythonScriptConfig());
				});
				refresh();
			})
		);

	if (runnerSettings.scripts.length === 0) {
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: strings.noScriptsNotice,
		});
	} else {
		runnerSettings.scripts.forEach((script, index) => {
			renderScriptCard(containerEl, {
				ctx,
				feature,
				script,
				index,
				strings,
				isFeatureEnabled,
				refresh,
			});
		});
	}

	const placeholdersEl = containerEl.createDiv({ cls: "whying-python-runner-help" });
	placeholdersEl.createEl("h4", {
		text: strings.placeholdersTitle,
	});
	const listEl = placeholdersEl.createEl("ul");
	for (const item of strings.placeholderItems) {
		const listItemEl = listEl.createEl("li");
		listItemEl.createEl("code", { text: item.token });
		listItemEl.appendText(` ${item.description}`);
	}
}

interface RenderScriptCardOptions {
	ctx: SettingTabContext;
	feature: PythonScriptRunnerFeature | null;
	script: PythonScriptConfig;
	index: number;
	strings: SettingsLocalization["pythonScriptRunner"];
	isFeatureEnabled: boolean;
	refresh: () => void;
}

function renderScriptCard(containerEl: HTMLElement, options: RenderScriptCardOptions): void {
	const { ctx, feature, script, index, strings, isFeatureEnabled, refresh } = options;
	const cardEl = containerEl.createDiv({ cls: "whying-python-script-card" });
	cardEl.createEl("h4", {
		cls: "whying-python-script-card-title",
		text: script.name.trim() || strings.unnamedScript(index + 1),
	});

	const save = async (update: () => void) => {
		await saveAndNotify(ctx, update);
	};

	new Setting(cardEl)
		.setName(strings.enabledName)
		.setDesc(strings.enabledDescription)
		.addToggle((toggle) =>
			toggle.setValue(script.enabled).onChange(async (value) => {
				await save(() => {
					script.enabled = value;
				});
			})
		);

	new Setting(cardEl)
		.setName(strings.standaloneScriptName)
		.setDesc(strings.standaloneScriptDescription)
		.addToggle((toggle) =>
			toggle.setValue(script.useIsolatedScript).onChange(async (value) => {
				await save(() => {
					script.useIsolatedScript = value;
				});
				refresh();
			})
		);

	new Setting(cardEl)
		.setName(strings.nameName)
		.setDesc(strings.nameDescription)
		.addText((text) =>
			text.setPlaceholder(strings.unnamedScript(index + 1)).setValue(script.name).onChange(async (value) => {
				await save(() => {
					script.name = value;
				});
				refresh();
			})
		);

	new Setting(cardEl)
		.setName(strings.projectPathName)
		.setDesc(
			script.useIsolatedScript
				? strings.projectPathDisabledDescription
				: strings.projectPathDescription
		)
		.addText((text) => {
			text
				.setPlaceholder(strings.projectPathPlaceholder)
				.setValue(script.projectPath)
				.setDisabled(script.useIsolatedScript);
			text.onChange(async (value) => {
				await save(() => {
					script.projectPath = value;
				});
			});
		});

	new Setting(cardEl)
		.setName(strings.scriptPathName)
		.setDesc(strings.scriptPathDescription)
		.addText((text) =>
			text.setPlaceholder(strings.scriptPathPlaceholder).setValue(script.scriptPath).onChange(async (value) => {
				await save(() => {
					script.scriptPath = value;
				});
			})
		);

	new Setting(cardEl)
		.setName(strings.workingDirectoryName)
		.setDesc(
			script.useIsolatedScript
				? strings.workingDirectoryStandaloneDescription
				: strings.workingDirectoryProjectDescription
		)
		.addText((text) =>
			text
				.setPlaceholder(
					script.useIsolatedScript
						? strings.workingDirectoryStandalonePlaceholder
						: strings.workingDirectoryProjectPlaceholder
				)
				.setValue(script.workingDirectory ?? "")
				.onChange(async (value) => {
					await save(() => {
						script.workingDirectory = value;
					});
				})
		);

	new Setting(cardEl)
		.setName(strings.argsTemplateName)
		.setDesc(strings.argsTemplateDescription)
		.addTextArea((textArea) => {
			textArea.inputEl.rows = 3;
			textArea.setPlaceholder("${file}");
			textArea.setValue(script.argsTemplate);
			textArea.onChange(async (value) => {
				await save(() => {
					script.argsTemplate = value;
				});
			});
		});

	new Setting(cardEl)
		.setName(strings.timeoutName)
		.setDesc(strings.timeoutDescription)
		.addText((text) => {
			text.inputEl.type = "number";
			text.inputEl.min = "1";
			text.setPlaceholder(strings.timeoutPlaceholder);
			text.setValue(script.timeoutMs ? String(script.timeoutMs) : "");
			text.onChange(async (value) => {
				const trimmedValue = value.trim();
				if (!trimmedValue) {
					await save(() => {
						delete script.timeoutMs;
					});
					return;
				}

				const parsed = Number.parseInt(trimmedValue, 10);
				if (!Number.isFinite(parsed) || parsed <= 0) {
					return;
				}

				await save(() => {
					script.timeoutMs = parsed;
				});
			});
		});

	const isRunningThisScript =
		ctx.settings.pythonScriptRunner.lastRun?.status === "running" &&
		ctx.settings.pythonScriptRunner.lastRun?.scriptId === script.id;

	new Setting(cardEl)
		.setName(strings.actionsName)
		.setDesc(isFeatureEnabled ? strings.actionsDescription : strings.disabledNotice)
		.addButton((button) => {
			const canRun = isFeatureEnabled && script.enabled && feature?.isReady() && !feature.isRunning();
			button.setButtonText(isRunningThisScript ? strings.runningButtonText : strings.runButtonText);
			if (canRun) {
				button.setCta();
			}
			button.setDisabled(!canRun);
			button.onClick(() => {
				if (!feature) {
					new Notice("Python script runner is unavailable.");
					return;
				}

				void runScriptAndRefresh(feature, script.id, refresh);
			});
		})
		.addButton((button) =>
			button
				.setButtonText(strings.deleteButtonText)
				.setWarning()
				.setDisabled(isRunningThisScript)
				.onClick(async () => {
					await save(() => {
						removeScriptById(ctx.settings.pythonScriptRunner.scripts, script.id);
						if (ctx.settings.pythonScriptRunner.lastRun?.scriptId === script.id) {
							delete ctx.settings.pythonScriptRunner.lastRun;
						}
					});
					refresh();
				})
		);
}

async function runScriptAndRefresh(
	feature: PythonScriptRunnerFeature,
	scriptId: string,
	refresh: () => void
): Promise<void> {
	const runPromise = feature.runScriptForActiveFile(scriptId);
	refresh();
	await runPromise;
	refresh();
}

function removeScriptById(scripts: PythonScriptConfig[], scriptId: string): void {
	const scriptIndex = scripts.findIndex((item) => item.id === scriptId);
	if (scriptIndex >= 0) {
		scripts.splice(scriptIndex, 1);
	}
}

async function saveAndNotify(ctx: SettingTabContext, update: () => void): Promise<void> {
	update();
	await ctx.saveSettings();
	ctx.notifyFeatureSettingsChanged(PYTHON_SCRIPT_RUNNER_FEATURE_ID);
}

function renderLastRunSection(
	containerEl: HTMLElement,
	record: PythonScriptLastRunRecord | undefined,
	strings: SettingsLocalization["pythonScriptRunner"]
): void {
	new Setting(containerEl)
		.setName(strings.lastRunTitle)
		.setDesc(strings.lastRunDescription)
		.setHeading();

	if (!record) {
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: strings.noLastRunNotice,
		});
		return;
	}

	const recordEl = containerEl.createDiv({ cls: "whying-python-run-record" });
	appendMetaRow(recordEl, strings.scriptNameName, record.scriptName);
	appendMetaRow(recordEl, strings.statusName, strings.statusLabels[record.status]);
	appendMetaRow(recordEl, strings.startedAtName, formatTimestamp(record.startedAt));
	appendMetaRow(recordEl, strings.endedAtName, formatTimestamp(record.endedAt));

	if (record.exitCode !== undefined) {
		appendMetaRow(recordEl, strings.exitCodeName, String(record.exitCode));
	}

	if (record.signal) {
		appendMetaRow(recordEl, strings.signalName, record.signal);
	}

	if (record.errorMessage) {
		appendMetaRow(recordEl, strings.errorMessageName, record.errorMessage);
	}

	if (record.resolvedCommand) {
		appendCodeBlock(recordEl, strings.resolvedCommandName, record.resolvedCommand);
	}

	if (record.stdout) {
		appendCodeBlock(recordEl, strings.stdoutName, record.stdout);
	}

	if (record.stderr) {
		appendCodeBlock(recordEl, strings.stderrName, record.stderr);
	}
}

function appendMetaRow(containerEl: HTMLElement, label: string, value: string): void {
	const rowEl = containerEl.createDiv({ cls: "whying-python-run-meta-row" });
	rowEl.createEl("span", {
		cls: "whying-python-run-meta-label",
		text: label,
	});
	rowEl.createEl("span", {
		cls: "whying-python-run-meta-value",
		text: value,
	});
}

function appendCodeBlock(containerEl: HTMLElement, label: string, value: string): void {
	const blockEl = containerEl.createDiv({ cls: "whying-python-run-code-block" });
	blockEl.createEl("div", {
		cls: "whying-python-run-code-label",
		text: label,
	});
	blockEl.createEl("pre", {
		cls: "whying-python-run-code",
		text: value,
	});
}

function formatTimestamp(value: number | undefined): string {
	if (!value) {
		return "—";
	}

	return new Date(value).toLocaleString();
}
