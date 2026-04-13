import { existsSync, statSync } from "fs";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { dirname, isAbsolute, resolve } from "path";
import { FileSystemAdapter, Notice, TFile } from "obsidian";
import type { Feature } from "./feature";
import {
	PYTHON_SCRIPT_RUNNER_FEATURE_ID,
	type PythonScriptExecutionMode,
	type PythonScriptConfig,
	type PythonScriptLastRunRecord,
	type PythonScriptRunnerSettings,
} from "./python-script-runner-types";
import type { WhyingPluginContext } from "../types";

interface PythonScriptTemplateContext {
	file: string;
	folder: string;
	vault: string;
	name: string;
	path: string;
}

const TEMPLATE_PLACEHOLDER_PATTERN = /\$\{(file|folder|vault|name|path)\}/g;

export class PythonScriptRunnerFeature implements Feature {
	id = PYTHON_SCRIPT_RUNNER_FEATURE_ID;
	name = "Python Script Runner";

	private plugin: WhyingPluginContext | null = null;
	private runningChild: ChildProcessWithoutNullStreams | null = null;
	private readonly registeredCommandIds = new Set<string>();

	private get settings(): PythonScriptRunnerSettings | null {
		return this.plugin?.settings.pythonScriptRunner ?? null;
	}

	isReady(): boolean {
		return this.plugin !== null;
	}

	isRunning(): boolean {
		return this.runningChild !== null;
	}

	onload(plugin: WhyingPluginContext): void {
		this.plugin = plugin;
		this.syncCommands();
	}

	onunload(): void {
		if (this.runningChild) {
			const lastRun = this.settings?.lastRun;
			if (lastRun?.status === "running" && this.settings) {
				this.settings.lastRun = {
					...lastRun,
					status: "error",
					endedAt: Date.now(),
					errorMessage: "Script run stopped because the feature was disabled or the plugin unloaded.",
				};
				void this.plugin?.saveSettings();
			}

			this.runningChild.kill();
			this.runningChild = null;
		}

		this.unregisterCommands();
		this.plugin = null;
	}

	onSettingsChanged(): void {
		this.syncCommands();
	}

	async runScriptForActiveFile(scriptId: string): Promise<PythonScriptLastRunRecord | null> {
		if (!this.plugin || !this.settings) {
			new Notice("Enable the python script runner feature before running scripts.");
			return null;
		}

		if (this.runningChild) {
			new Notice("Another python script is already running.");
			return this.settings.lastRun ?? null;
		}

		const script = this.settings.scripts.find((item) => item.id === scriptId);
		if (!script) {
			const record = await this.failBeforeSpawn(scriptId, "Unknown script", "Script configuration was not found.");
			new Notice(record.errorMessage ?? "Script configuration was not found.");
			return record;
		}

		const scriptName = getScriptDisplayName(script);
		if (!script.enabled) {
			const record = await this.failBeforeSpawn(scriptId, scriptName, "Enable this script before running it.");
			new Notice(record.errorMessage ?? "Enable this script before running it.");
			return record;
		}

		const activeFile = this.plugin.app.workspace.getActiveFile();
		if (!(activeFile instanceof TFile)) {
			const record = await this.failBeforeSpawn(scriptId, scriptName, "Open a file in Obsidian before running the script.");
			new Notice(record.errorMessage ?? "Open a file in Obsidian before running the script.");
			return record;
		}

		const uvPath = this.settings.uvPath.trim();
		if (!uvPath) {
			const record = await this.failBeforeSpawn(scriptId, scriptName, "Set a UV executable path before running scripts.");
			new Notice(record.errorMessage ?? "Set a UV executable path before running scripts.");
			return record;
		}

		try {
			const templateContext = this.createTemplateContext(activeFile);
			const scriptPath = script.scriptPath.trim();
			const resolvedScriptPath = resolveConfiguredScriptPath(scriptPath, templateContext.vault);
			const executionMode: PythonScriptExecutionMode = script.useIsolatedScript
				? "standalone-script"
				: "project";
			const projectPath = resolveConfiguredDirectoryPath(script.projectPath, templateContext.vault);
			const defaultWorkingDirectory =
				executionMode === "project" ? projectPath : dirname(resolvedScriptPath);
			const workingDirectory =
				resolveConfiguredDirectoryPath(script.workingDirectory?.trim() ?? "", templateContext.vault) ||
				defaultWorkingDirectory;

			const validationError = validateScriptConfig(
				executionMode,
				projectPath,
				workingDirectory,
				resolvedScriptPath,
				script.timeoutMs
			);
			if (validationError) {
				const record = await this.failBeforeSpawn(scriptId, scriptName, validationError);
				new Notice(record.errorMessage ?? validationError);
				return record;
			}

			if (!existsSync(resolvedScriptPath) || !statSync(resolvedScriptPath).isFile()) {
				const record = await this.failBeforeSpawn(
					scriptId,
					scriptName,
					`Script file was not found: ${resolvedScriptPath}`
				);
				new Notice(record.errorMessage ?? "Script file was not found.");
				return record;
			}

			const resolvedArgs = resolveTemplateArgs(script.argsTemplate, templateContext);
			const timeoutMs = resolveTimeout(script.timeoutMs, this.settings.defaultTimeoutMs);
			const args =
				executionMode === "standalone-script"
					? ["run", "--no-project", "--script", resolvedScriptPath, ...resolvedArgs]
					: ["run", "--project", projectPath, "python", resolvedScriptPath, ...resolvedArgs];
			const startedAt = Date.now();
			const runningRecord: PythonScriptLastRunRecord = {
				scriptId,
				scriptName,
				status: "running",
				startedAt,
				resolvedCommand: formatCommand(uvPath, args),
			};

			await this.persistLastRun(runningRecord);
			new Notice(`Running ${scriptName}...`, 1500);

			return await new Promise<PythonScriptLastRunRecord>((resolveRun) => {
				let settled = false;
				let stdout = "";
				let stderr = "";
				let timedOut = false;

				const finalize = async (
					record: Omit<PythonScriptLastRunRecord, "scriptId" | "scriptName"> &
						Pick<PythonScriptLastRunRecord, "resolvedCommand">
				) => {
					if (settled) {
						return;
					}

					settled = true;
					if (timer !== null) {
						window.clearTimeout(timer);
					}
					this.runningChild = null;

					const finalRecord: PythonScriptLastRunRecord = {
						scriptId,
						scriptName,
						stdout,
						stderr,
						...record,
					};

					await this.persistLastRun(finalRecord);
					this.showCompletionNotice(finalRecord);
					resolveRun(finalRecord);
				};

				let timer: number | null = null;
				let child: ChildProcessWithoutNullStreams;

				try {
					child = spawn(uvPath, args, {
						cwd: workingDirectory,
						shell: false,
						windowsHide: true,
					});
				} catch (error) {
					void finalize({
						status: "spawn_error",
						startedAt,
						endedAt: Date.now(),
						errorMessage: toErrorMessage(error),
						resolvedCommand: runningRecord.resolvedCommand,
					});
					return;
				}

				this.runningChild = child;
				child.stdout.setEncoding("utf8");
				child.stderr.setEncoding("utf8");

				child.stdout.on("data", (chunk: string) => {
					stdout += chunk;
				});

				child.stderr.on("data", (chunk: string) => {
					stderr += chunk;
				});

				child.once("error", (error) => {
					void finalize({
						status: "spawn_error",
						startedAt,
						endedAt: Date.now(),
						errorMessage: toErrorMessage(error),
						resolvedCommand: runningRecord.resolvedCommand,
					});
				});

				child.once("close", (exitCode, signal) => {
					const endedAt = Date.now();
					void finalize({
						status: timedOut ? "timeout" : exitCode === 0 ? "success" : "error",
						startedAt,
						endedAt,
						exitCode,
						signal,
						errorMessage: timedOut ? `Process exceeded ${timeoutMs} ms and was terminated.` : undefined,
						resolvedCommand: runningRecord.resolvedCommand,
					});
				});

				timer = window.setTimeout(() => {
					timedOut = true;
					child.kill();
				}, timeoutMs);
			});
		} catch (error) {
			const message = toErrorMessage(error);
			const record = await this.failBeforeSpawn(scriptId, scriptName, message);
			new Notice(message);
			return record;
		}
	}

	private async persistLastRun(record: PythonScriptLastRunRecord): Promise<void> {
		if (!this.settings || !this.plugin) {
			return;
		}

		this.settings.lastRun = record;
		await this.plugin.saveSettings();
	}

	private async failBeforeSpawn(
		scriptId: string,
		scriptName: string,
		errorMessage: string
	): Promise<PythonScriptLastRunRecord> {
		const record: PythonScriptLastRunRecord = {
			scriptId,
			scriptName,
			status: "spawn_error",
			startedAt: Date.now(),
			endedAt: Date.now(),
			errorMessage,
		};

		await this.persistLastRun(record);
		return record;
	}

	private createTemplateContext(file: TFile): PythonScriptTemplateContext {
		if (!this.plugin) {
			throw new Error("Python script runner is not ready.");
		}

		const adapter = this.plugin.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			throw new Error("Python script runner only works with local desktop vaults.");
		}

		const vaultPath = adapter.getBasePath();
		const absoluteFilePath = resolve(vaultPath, file.path);

		return {
			file: absoluteFilePath,
			folder: dirname(absoluteFilePath),
			vault: vaultPath,
			name: file.basename,
			path: file.path,
		};
	}

	private showCompletionNotice(record: PythonScriptLastRunRecord): void {
		switch (record.status) {
			case "success":
				new Notice(`${record.scriptName} finished successfully.`, 2500);
				break;
			case "timeout":
				new Notice(`${record.scriptName} timed out.`, 4000);
				break;
			case "spawn_error":
				new Notice(record.errorMessage ?? `${record.scriptName} could not be started.`, 5000);
				break;
			case "error":
				new Notice(
					record.exitCode === undefined || record.exitCode === null
						? `${record.scriptName} failed.`
						: `${record.scriptName} failed with exit code ${record.exitCode}.`,
					4000
				);
				break;
		}
	}

	private syncCommands(): void {
		if (!this.plugin) {
			return;
		}

		const desiredScripts = this.settings?.scripts ?? [];
		const desiredCommandIds = new Set(desiredScripts.map((script) => getScriptCommandId(script.id)));

		for (const commandId of Array.from(this.registeredCommandIds)) {
			if (!desiredCommandIds.has(commandId)) {
				this.plugin.removeCommand(commandId);
				this.registeredCommandIds.delete(commandId);
			}
		}

		for (const script of desiredScripts) {
			const commandId = getScriptCommandId(script.id);

			if (this.registeredCommandIds.has(commandId)) {
				this.plugin.removeCommand(commandId);
				this.registeredCommandIds.delete(commandId);
			}

			this.plugin.addCommand({
				id: commandId,
				name: getScriptCommandName(script),
				checkCallback: (checking) => this.handleCommandExecution(script.id, checking),
			});
			this.registeredCommandIds.add(commandId);
		}
	}

	private unregisterCommands(): void {
		if (!this.plugin) {
			this.registeredCommandIds.clear();
			return;
		}

		for (const commandId of this.registeredCommandIds) {
			this.plugin.removeCommand(commandId);
		}

		this.registeredCommandIds.clear();
	}

	private handleCommandExecution(scriptId: string, checking: boolean): boolean {
		if (!this.canRunScriptFromCommand(scriptId)) {
			return false;
		}

		if (!checking) {
			void this.runScriptForActiveFile(scriptId);
		}

		return true;
	}

	private canRunScriptFromCommand(scriptId: string): boolean {
		if (!this.plugin || !this.settings || this.runningChild) {
			return false;
		}

		const script = this.settings.scripts.find((item) => item.id === scriptId);
		if (!script?.enabled) {
			return false;
		}

		return this.plugin.app.workspace.getActiveFile() instanceof TFile;
	}
}

function getScriptDisplayName(script: PythonScriptConfig): string {
	return script.name.trim() || "Unnamed Python script";
}

function getScriptCommandId(scriptId: string): string {
	return `run-script-${scriptId}`;
}

function getScriptCommandName(script: PythonScriptConfig): string {
	return `Run Python script: ${getScriptDisplayName(script)}`;
}

function resolveConfiguredDirectoryPath(value: string, vaultPath: string): string {
	const trimmedValue = value.trim();
	if (!trimmedValue) {
		return "";
	}

	return isAbsolute(trimmedValue) ? trimmedValue : resolve(vaultPath, trimmedValue);
}

function resolveConfiguredScriptPath(value: string, vaultPath: string): string {
	if (!value) {
		return "";
	}

	return isAbsolute(value) ? value : resolve(vaultPath, value);
}

function validateScriptConfig(
	executionMode: PythonScriptExecutionMode,
	projectPath: string,
	workingDirectory: string,
	resolvedScriptPath: string,
	timeoutMs: number | undefined
): string | null {
	if (executionMode === "project") {
		if (!projectPath) {
			return "Project path is required when standalone script mode is disabled.";
		}

		if (!existsSync(projectPath) || !statSync(projectPath).isDirectory()) {
			return `Project path does not exist: ${projectPath}`;
		}
	}

	if (!workingDirectory) {
		return "Working directory is required.";
	}

	if (!existsSync(workingDirectory) || !statSync(workingDirectory).isDirectory()) {
		return `Working directory does not exist: ${workingDirectory}`;
	}

	if (!resolvedScriptPath) {
		return "Script path is required.";
	}

	if (resolveTimeout(timeoutMs, 1) <= 0) {
		return "Timeout must be greater than 0 milliseconds.";
	}

	return null;
}

function resolveTimeout(value: number | undefined, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveTemplateArgs(template: string, context: PythonScriptTemplateContext): string[] {
	const trimmedTemplate = template.trim();
	if (!trimmedTemplate) {
		return [];
	}

	return tokenizeTemplate(trimmedTemplate).map((part) =>
		part.replace(TEMPLATE_PLACEHOLDER_PATTERN, (_, key: keyof PythonScriptTemplateContext) => context[key])
	);
}

function tokenizeTemplate(template: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let quote: '"' | "'" | null = null;
	let escaped = false;

	const pushCurrentToken = () => {
		if (current.length > 0) {
			tokens.push(current);
			current = "";
		}
	};

	for (const character of template) {
		if (escaped) {
			current += character;
			escaped = false;
			continue;
		}

		if (character === "\\") {
			escaped = true;
			continue;
		}

		if (quote) {
			if (character === quote) {
				quote = null;
			} else {
				current += character;
			}
			continue;
		}

		if (character === "'" || character === "\"") {
			quote = character;
			continue;
		}

		if (/\s/.test(character)) {
			pushCurrentToken();
			continue;
		}

		current += character;
	}

	if (escaped) {
		current += "\\";
	}

	if (quote) {
		throw new Error("Arguments template contains an unterminated quote.");
	}

	pushCurrentToken();
	return tokens;
}

function formatCommand(command: string, args: string[]): string {
	return [command, ...args].map(quoteCommandPart).join(" ");
}

function quoteCommandPart(value: string): string {
	if (!value) {
		return "\"\"";
	}

	if (!/[\s"]/u.test(value)) {
		return value;
	}

	return `"${value.replace(/(["\\])/g, "\\$1")}"`;
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}
